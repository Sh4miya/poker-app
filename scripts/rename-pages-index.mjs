import { renameSync } from 'node:fs'
import { join } from 'node:path'

const distDir = new URL('../dist/', import.meta.url)
renameSync(join(distDir.pathname, 'index.dev.html'), join(distDir.pathname, 'index.html'))
