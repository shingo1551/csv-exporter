/// <reference types="vite/client" />

import 'hono'

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props?: { title?: string }): Response | Promise<Response>
  }
}

declare global {
  /** ビルド時に Vite の define で埋め込まれた git コミットハッシュ。 */
  const __GIT_HASH__: string
  /** ビルド時点で未コミットの変更がある場合 true。 */
  const __GIT_DIRTY__: boolean
}

