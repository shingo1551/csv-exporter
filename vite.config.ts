import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'
import { execSync } from 'node:child_process'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

// ビルド時点の git 情報を取得してバンドルへ埋め込む（取得できない場合は unknown / 非 dirty）。
const exec = (command: string): string =>
  execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
let gitHash = 'unknown'
let gitDirty = false
try { gitHash = exec('git rev-parse --short=7 HEAD') } catch {}
try { gitDirty = exec('git status --porcelain') !== '' } catch {}

export default defineConfig({
  server: { host: '0.0.0.0' },
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
    __GIT_DIRTY__: String(gitDirty),
  },
  plugins: [honox({ devServer: { adapter }, client: { input: ['/app/client.ts'] } }), build()],
})
