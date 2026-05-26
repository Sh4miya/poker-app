import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
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
