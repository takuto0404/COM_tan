/**
 * メディア再生・先読みのPort(IMPLEMENTATION_PLAN 1.4)。
 * hooks層はこのインターフェースにのみ依存し、実装(本番/テスト)を差し替えられる。
 * path はストレージ内のパス。URL解決(署名付きURL)は resolver が担う。
 */

export interface AudioPort {
  preload(paths: string[]): Promise<void>
  /** 再生完了で resolve する。stop() された場合も resolve する */
  play(path: string): Promise<void>
  stop(): void
}

export interface ImagePort {
  prefetch(paths: string[]): Promise<void>
  resolveUrl(path: string): string
}

/** ストレージパス → 配信URL(署名付き)の対応表 */
export type MediaUrlMap = Record<string, string>

declare global {
  interface Window {
    __test?: {
      audio: { played: string[] }
    }
  }
}

/** 本番実装: HTMLAudioElement + 署名付きURL */
export function createHtmlAudioPort(urls: MediaUrlMap): AudioPort {
  const cache = new Map<string, HTMLAudioElement>()
  let current: HTMLAudioElement | null = null
  let currentResolve: (() => void) | null = null

  function element(path: string): HTMLAudioElement {
    let el = cache.get(path)
    if (!el) {
      const url = urls[path]
      if (!url) throw new Error(`未解決のメディアパス: ${path}`)
      el = new Audio(url)
      el.preload = 'auto'
      cache.set(path, el)
    }
    return el
  }

  function settle(): void {
    if (currentResolve) {
      const resolve = currentResolve
      currentResolve = null
      current = null
      resolve()
    }
  }

  return {
    async preload(paths) {
      for (const path of paths) element(path).load()
    },
    play(path) {
      this.stop()
      const el = element(path)
      el.currentTime = 0
      return new Promise<void>((resolve) => {
        current = el
        currentResolve = resolve
        el.onended = settle
        el.onerror = settle
        void el.play().catch(settle)
      })
    },
    stop() {
      if (current) {
        current.onended = null
        current.onerror = null
        current.pause()
      }
      settle()
    },
  }
}

/**
 * テストモード実装(E2E用): 実再生せず短い遅延で完了し、
 * 再生履歴を window.__test.audio.played に記録する。
 */
export function createTestAudioPort(delayMs = 50): AudioPort {
  let cancel: (() => void) | null = null
  function record(path: string): void {
    if (typeof window === 'undefined') return
    window.__test ??= { audio: { played: [] } }
    window.__test.audio.played.push(path)
  }
  return {
    async preload() {},
    play(path) {
      this.stop()
      record(path)
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          cancel = null
          resolve()
        }, delayMs)
        cancel = () => {
          clearTimeout(timer)
          resolve()
        }
      })
    },
    stop() {
      if (cancel) {
        const c = cancel
        cancel = null
        c()
      }
    },
  }
}

/** ユニットテスト用: 即時完了・履歴を配列に記録 */
export function createFakeAudioPort(): AudioPort & { played: string[] } {
  const played: string[] = []
  return {
    played,
    async preload() {},
    async play(path) {
      played.push(path)
    },
    stop() {},
  }
}

export function createImagePort(urls: MediaUrlMap): ImagePort {
  return {
    async prefetch(paths) {
      if (typeof window === 'undefined') return
      for (const path of paths) {
        const url = urls[path]
        if (!url) continue
        const img = new window.Image()
        img.src = url
      }
    },
    resolveUrl(path) {
      const url = urls[path]
      if (!url) throw new Error(`未解決のメディアパス: ${path}`)
      return url
    },
  }
}
