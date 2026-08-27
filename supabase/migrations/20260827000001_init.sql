-- COM単 schema v1 (SPEC 6.1 + 会話で確定したイメージ画像・端末ローカル日付を反映)

-- ========== tables ==========

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 1 and 12),
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null
);

create table public.word_sets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  set_number int not null unique, -- 単語帳上の通し番号(1〜500)
  title text,
  is_published boolean not null default false
);

create table public.words (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.word_sets (id) on delete cascade,
  position int not null check (position between 1 and 10),
  headword text not null,
  meaning text,
  tip text, -- チップス(NULL可)
  word_audio_path text not null, -- 単語読み上げ音声
  image_path text not null, -- イメージ画像(全単語必須)
  unique (set_id, position)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null unique references public.words (id) on delete cascade,
  sentence_text text not null, -- 穴埋め位置は "{{blank}}" プレースホルダ
  sentence_audio_path text not null -- 穴埋めが埋まった全文の読み上げ音声
);

create table public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  audio_path text not null,
  label text not null, -- 答え表示用の単語テキスト
  is_correct boolean not null
);

-- 正解は1問につき1つ(選択肢数=4はインポート時バリデーションで担保)
create unique index one_correct_choice_per_question
  on public.choices (question_id) where is_correct;

create table public.set_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_id uuid not null references public.word_sets (id),
  completed_on date not null, -- ユーザー端末のローカル日付(サーバー受理窓で検証)
  points int not null check (points in (0, 10)),
  first_try_correct_count int check (first_try_correct_count between 0 and 10),
  created_at timestamptz not null default now(),
  unique (user_id, set_id, completed_on) -- 1日1回制限の物理担保
);

-- カレンダー・月間ランキング集計用
create index set_completions_user_date on public.set_completions (user_id, completed_on);
create index set_completions_date on public.set_completions (completed_on);

create table public.answer_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  was_first_try_correct boolean not null,
  attempt_count int not null check (attempt_count >= 1),
  answered_at timestamptz not null default now()
);

create index answer_logs_question on public.answer_logs (question_id);

-- ========== RLS ==========

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.word_sets enable row level security;
alter table public.words enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.set_completions enable row level security;
alter table public.answer_logs enable row level security;

-- profiles: 本人は自分の行を作成・更新可。ニックネームはランキング表示のため認証済み全員が参照可
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- コンテンツ: 認証済みユーザーは公開セットのみ参照可(書き込みはservice roleのみ=ポリシーなし)
create policy "categories_select" on public.categories
  for select to authenticated using (true);
create policy "word_sets_select_published" on public.word_sets
  for select to authenticated using (is_published);
create policy "words_select_published" on public.words
  for select to authenticated using (
    exists (select 1 from public.word_sets s where s.id = set_id and s.is_published)
  );
create policy "questions_select_published" on public.questions
  for select to authenticated using (
    exists (
      select 1 from public.words w
      join public.word_sets s on s.id = w.set_id
      where w.id = word_id and s.is_published
    )
  );
create policy "choices_select_published" on public.choices
  for select to authenticated using (
    exists (
      select 1 from public.questions q
      join public.words w on w.id = q.word_id
      join public.word_sets s on s.id = w.set_id
      where q.id = question_id and s.is_published
    )
  );

-- 学習記録: 参照は本人のみ。INSERTはServer Action(service role)経由のみ(ポイント改ざん防止, SPEC 6.3)
create policy "set_completions_select_own" on public.set_completions
  for select to authenticated using (user_id = auth.uid());

create policy "answer_logs_select_own" on public.answer_logs
  for select to authenticated using (user_id = auth.uid());

-- ========== storage ==========

-- 教材メディア(音声・画像)。非公開バケット: 配信は署名付きURLのみ(SPEC 3.1)
insert into storage.buckets (id, name, public)
values ('media', 'media', false);
