/**
 * 仮データ投入スクリプト(T0-3)
 * ローカルSupabaseスタックに 2カテゴリ / 10セット / 100語 + メディア(無音MP3・ダミー画像)
 * とテストユーザーを投入する。
 *
 * 前提: `supabase start` でローカルスタックが起動していること。
 * 接続情報は環境変数(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)か、
 * 未設定なら `supabase status -o env` から自動取得する。
 */
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { blankOutWord } from '../src/domain/text/inflection'

// ---------- 接続 ----------

function resolveConnection(): { url: string; serviceRoleKey: string } {
  let url = process.env.SUPABASE_URL
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceRoleKey) return { url, serviceRoleKey }

  const out = execSync('supabase status -o env', { encoding: 'utf8' })
  for (const line of out.split('\n')) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/)
    if (!m) continue
    const [, key, value] = m
    if (!url && /^(API_URL|SUPABASE_URL)$/.test(key)) url = value
    if (!serviceRoleKey && /SERVICE_ROLE/.test(key)) serviceRoleKey = value
  }
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase接続情報が取得できません。`supabase start` 実行後に再試行するか、SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定してください。',
    )
  }
  return { url, serviceRoleKey }
}

// ---------- ダミーメディア ----------

/** MPEG-1 Layer III 128kbps 44.1kHz の無音フレーム(417byte)を並べた約1秒の無音MP3 */
function silentMp3(): Buffer {
  const frame = Buffer.alloc(417)
  frame[0] = 0xff
  frame[1] = 0xfb
  frame[2] = 0x90
  frame[3] = 0x64
  return Buffer.concat(Array.from({ length: 38 }, () => frame))
}

/** 1x1 PNG */
function dummyPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
    'base64',
  )
}

// ---------- 仮データ ----------

// [headword, 意味, 例文(単語を1回含む)]
const WORDS: Array<[string, string, string]> = [
  ['abandon', '見捨てる', 'They had to abandon the ship before it sank.'],
  ['benefit', '利益', 'Regular exercise has a clear benefit for your health.'],
  ['candidate', '候補者', 'She is the strongest candidate for the job.'],
  ['decline', '断る・減少する', 'He had to decline the invitation to the party.'],
  ['efficient', '効率的な', 'This new engine is more efficient than the old one.'],
  ['familiar', 'よく知っている', 'Her face looked familiar to me.'],
  ['generate', '生み出す', 'Wind turbines generate electricity from wind.'],
  ['hesitate', 'ためらう', 'Do not hesitate to ask questions in class.'],
  ['identify', '特定する', 'Can you identify the man in this photo?'],
  ['justify', '正当化する', 'Nothing can justify such rude behavior.'],
  ['knowledge', '知識', 'She has a deep knowledge of Japanese history.'],
  ['landscape', '風景', 'The landscape of this island is breathtaking.'],
  ['maintain', '維持する', 'It is hard to maintain a healthy diet.'],
  ['negotiate', '交渉する', 'The two companies will negotiate a new contract.'],
  ['obstacle', '障害', 'Lack of money was the biggest obstacle to his plan.'],
  ['persuade', '説得する', 'I tried to persuade him to join our team.'],
  ['quantity', '量', 'The quality matters more than the quantity.'],
  ['reluctant', '気が進まない', 'She was reluctant to leave her hometown.'],
  ['sacrifice', '犠牲にする', 'Parents often sacrifice their time for their children.'],
  ['temporary', '一時的な', 'This is only a temporary solution to the problem.'],
  ['undergo', '経験する', 'The patient will undergo surgery tomorrow.'],
  ['vague', '曖昧な', 'His answer was too vague to understand.'],
  ['witness', '目撃する', 'She happened to witness the accident.'],
  ['yield', '生み出す・譲る', 'This farm can yield enough rice for the village.'],
  ['adapt', '適応する', 'Animals must adapt to their environment to survive.'],
  ['border', '国境', 'The river forms the border between the two countries.'],
  ['collapse', '崩壊する', 'The old bridge could collapse at any moment.'],
  ['demand', '要求する', 'The workers demand higher wages.'],
  ['emerge', '現れる', 'New problems emerge as technology develops.'],
  ['fatigue', '疲労', 'Driver fatigue is a major cause of accidents.'],
  ['grateful', '感謝している', 'I am grateful for all your support.'],
  ['harvest', '収穫', 'Farmers were busy with the rice harvest.'],
  ['imitate', '真似る', 'Children often imitate their parents.'],
  ['jealous', '嫉妬深い', 'He felt jealous of his friend’s success.'],
  ['keen', '熱心な', 'She is keen to learn foreign languages.'],
  ['launch', '開始する・発射する', 'The company will launch a new product next month.'],
  ['modest', '控えめな', 'Despite his fame, he remains modest.'],
  ['notion', '概念', 'The notion of time differs across cultures.'],
  ['occupy', '占める', 'Video games occupy most of his free time.'],
  ['portion', '部分', 'A large portion of the budget goes to education.'],
  ['quarrel', '口論', 'They had a quarrel over a small matter.'],
  ['resemble', '似ている', 'She closely resembles her mother.'],
  ['struggle', '奮闘する', 'Many students struggle with math.'],
  ['transform', '変換する', 'The internet has transformed our daily lives.'],
  ['urgent', '緊急の', 'He received an urgent message from the office.'],
  ['vivid', '鮮明な', 'I still have a vivid memory of that day.'],
  ['wander', 'さまよう', 'We wandered around the old town for hours.'],
  ['acquire', '習得する', 'It takes years to acquire a new language.'],
  ['bother', '悩ませる', 'Does the noise bother you at night?'],
  ['conclude', '結論づける', 'The report concluded that the plan was too risky.'],
  ['devote', '捧げる', 'She devoted her life to helping the poor.'],
  ['endure', '耐える', 'They had to endure the cold winter without heat.'],
  ['forbid', '禁じる', 'The rules forbid smoking in this building.'],
  ['genuine', '本物の', 'Her surprise seemed genuine to everyone.'],
  ['horizon', '地平線', 'The sun slowly sank below the horizon.'],
  ['insist', '主張する', 'He insisted on paying for the meal.'],
  ['journey', '旅', 'The journey to the village took three days.'],
  ['kneel', 'ひざまずく', 'He knelt down to tie his shoes.'],
  ['leisure', '余暇', 'She spends her leisure time reading novels.'],
  ['mature', '成熟した', 'He is very mature for his age.'],
  ['neglect', '怠る', 'Do not neglect your health while working hard.'],
  ['obtain', '得る', 'You must obtain permission before entering.'],
  ['praise', '称賛する', 'The teacher praised her effort in class.'],
  ['quit', 'やめる', 'He decided to quit his job and travel.'],
  ['rescue', '救助する', 'Firefighters rescued a cat from the tree.'],
  ['scatter', 'まき散らす', 'The wind scattered the leaves across the yard.'],
  ['tremble', '震える', 'Her hands trembled with fear.'],
  ['upset', '動揺させる', 'The bad news upset everyone in the room.'],
  ['venture', '冒険的事業', 'The new venture failed within a year.'],
  ['weep', '泣く', 'She began to weep at the sad news.'],
  ['accuse', '非難する', 'They accused him of stealing the money.'],
  ['betray', '裏切る', 'He would never betray his best friend.'],
  ['cautious', '用心深い', 'Be cautious when crossing the busy street.'],
  ['dominate', '支配する', 'One company dominates the entire market.'],
  ['elaborate', '精巧な', 'She made an elaborate plan for the trip.'],
  ['flexible', '柔軟な', 'Our schedule is flexible this week.'],
  ['glance', 'ちらっと見る', 'He glanced at his watch during the meeting.'],
  ['humble', '謙虚な', 'The champion remained humble in victory.'],
  ['inevitable', '避けられない', 'Change is inevitable in any organization.'],
  ['jury', '陪審', 'The jury found the man not guilty.'],
  ['keen-eyed', '目ざとい', 'The keen-eyed birdwatcher spotted a rare eagle.'],
  ['linger', '長居する', 'The smell of coffee lingered in the kitchen.'],
  ['mock', 'あざける', 'It is cruel to mock someone’s accent.'],
  ['nurture', '育む', 'Good teachers nurture curiosity in students.'],
  ['overcome', '克服する', 'She overcame her fear of public speaking.'],
  ['perceive', '知覚する', 'We perceive the world through our senses.'],
  ['quest', '探求', 'His quest for truth lasted a lifetime.'],
  ['retreat', '撤退する', 'The army was forced to retreat from the city.'],
  ['summon', '呼び出す', 'The king summoned his advisors at once.'],
  ['thrive', '繁栄する', 'Small businesses thrive in this district.'],
  ['utter', '口にする', 'She did not utter a single word all day.'],
  ['vanish', '消える', 'The magician made the coin vanish.'],
  ['withdraw', '引き出す・撤回する', 'He went to the bank to withdraw some cash.'],
  ['yearn', '切望する', 'She yearned to see her family again.'],
  ['zeal', '熱意', 'He studied English with great zeal.'],
  ['abundant', '豊富な', 'The region has abundant natural resources.'],
  ['bold', '大胆な', 'It was a bold decision to start over abroad.'],
  ['chase', '追いかける', 'The dog loves to chase the ball in the park.'],
  ['dedicate', '捧げる', 'The monument is dedicated to the war victims.'],
  ['evaluate', '評価する', 'Teachers evaluate students through tests and essays.'],
]

async function main() {
  const { url, serviceRoleKey } = resolveConnection()
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  console.log(`Seeding to ${url} ...`)

  // ----- テストユーザー -----
  const users = [
    { email: 'test1@example.com', nickname: 'テスト太郎', role: 'user' },
    { email: 'test2@example.com', nickname: 'テスト花子', role: 'user' },
    { email: 'admin@example.com', nickname: '管理者', role: 'admin' },
  ]
  for (const u of users) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: 'password123',
      email_confirm: true,
    })
    if (error) {
      if (!/already/i.test(error.message)) throw error
      console.log(`  user exists: ${u.email}`)
      continue
    }
    const { error: pErr } = await db.from('profiles').insert({
      id: data.user.id,
      nickname: u.nickname,
      role: u.role,
    })
    if (pErr) throw pErr
    console.log(`  user created: ${u.email}`)
  }

  // ----- カテゴリ -----
  const { data: cats, error: catErr } = await db
    .from('categories')
    .insert([
      { name: '基礎編', sort_order: 1 },
      { name: '応用編', sort_order: 2 },
    ])
    .select()
  if (catErr) throw catErr

  // ----- メディア(共有のダミーバイト) -----
  const mp3 = silentMp3()
  const png = dummyPng()
  const uploads: Array<{ path: string; body: Buffer; contentType: string }> = []

  // ----- セット・単語・問題・選択肢 -----
  for (let s = 0; s < 10; s++) {
    const setNumber = s + 1
    const category = cats[s < 5 ? 0 : 1]
    const isPublished = setNumber !== 10 // セット10は非公開(公開フラグの動作確認用)
    const { data: set, error: setErr } = await db
      .from('word_sets')
      .insert({
        category_id: category.id,
        set_number: setNumber,
        title: `セット${setNumber}`,
        is_published: isPublished,
      })
      .select()
      .single()
    if (setErr) throw setErr

    const wordRows = []
    const sentenceByPosition = new Map<number, string>()
    for (let p = 0; p < 10; p++) {
      const [headword, meaning, sentence] = WORDS[s * 10 + p]
      sentenceByPosition.set(p + 1, sentence)
      wordRows.push({
        set_id: set.id,
        position: p + 1,
        headword,
        meaning,
        tip:
          p % 3 === 0
            ? `「${headword}」は${meaning}の意味。例文のイメージとセットで覚えよう。`
            : null,
        word_audio_path: `audio/words/${setNumber}-${p + 1}.mp3`,
        image_path: `images/words/${setNumber}-${p + 1}.png`,
      })
    }
    const { data: words, error: wErr } = await db.from('words').insert(wordRows).select()
    if (wErr) throw wErr

    for (const word of words) {
      const sentence = sentenceByPosition.get(word.position)!
      // 例文中の語は過去形・進行形などに活用していてもよい(domainの語形マッチングで検出)
      const blanked = blankOutWord(sentence, word.headword)
      if (!blanked) {
        throw new Error(
          `例文に単語(活用形含む)が含まれていません: ${word.headword} / ${sentence}`,
        )
      }
      const { data: q, error: qErr } = await db
        .from('questions')
        .insert({
          word_id: word.id,
          sentence_text: blanked.sentenceText,
          answer_label: blanked.answerLabel,
          sentence_audio_path: `audio/sentences/${setNumber}-${word.position}.mp3`,
        })
        .select()
        .single()
      if (qErr) throw qErr

      // 選択肢: 正解 + 同セット内の他の3語
      const distractors = words.filter((w) => w.id !== word.id).slice(0, 3)
      const choiceRows = [
        {
          question_id: q.id,
          audio_path: word.word_audio_path,
          label: word.headword,
          is_correct: true,
        },
        ...distractors.map((d) => ({
          question_id: q.id,
          audio_path: d.word_audio_path,
          label: d.headword,
          is_correct: false,
        })),
      ]
      const { error: cErr } = await db.from('choices').insert(choiceRows)
      if (cErr) throw cErr

      uploads.push(
        { path: word.word_audio_path, body: mp3, contentType: 'audio/mpeg' },
        { path: word.image_path, body: png, contentType: 'image/png' },
        {
          path: `audio/sentences/${setNumber}-${word.position}.mp3`,
          body: mp3,
          contentType: 'audio/mpeg',
        },
      )
    }
    console.log(`  set ${setNumber} inserted (${isPublished ? 'published' : 'draft'})`)
  }

  // ----- ストレージへアップロード -----
  let done = 0
  for (const u of uploads) {
    const { error } = await db.storage
      .from('media')
      .upload(u.path, u.body, { contentType: u.contentType, upsert: true })
    if (error) throw new Error(`upload failed: ${u.path}: ${error.message}`)
    done++
  }
  console.log(`  media uploaded: ${done} files`)
  console.log('Seed completed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
