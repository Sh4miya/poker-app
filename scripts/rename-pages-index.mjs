import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(rootDir, 'dist')
const sourceHtml = join(distDir, 'index.dev.html')
const indexHtml = join(distDir, 'index.html')
const fallbackHtml = join(distDir, '404.html')
const noJekyll = join(distDir, '.nojekyll')

if (existsSync(sourceHtml)) {
  renameSync(sourceHtml, indexHtml)
}

const html = readFileSync(indexHtml, 'utf8').replace(
  '<title>Vite App</title>',
  '<title>Poker App</title>',
)

writeFileSync(indexHtml, html)
writeFileSync(fallbackHtml, html)
writeFileSync(noJekyll, '')

const rootIndexHtml = join(rootDir, 'index.html')
const rootFallbackHtml = join(rootDir, '404.html')
const rootNoJekyll = join(rootDir, '.nojekyll')
const rootFavicon = join(rootDir, 'favicon.ico')
const rootAssetsDir = join(rootDir, 'assets')
const distAssetsDir = join(distDir, 'assets')

cpSync(indexHtml, rootIndexHtml)
cpSync(fallbackHtml, rootFallbackHtml)
cpSync(noJekyll, rootNoJekyll)
cpSync(join(distDir, 'favicon.ico'), rootFavicon)
rmSync(rootAssetsDir, { recursive: true, force: true })
mkdirSync(rootAssetsDir, { recursive: true })
cpSync(distAssetsDir, rootAssetsDir, { recursive: true })
