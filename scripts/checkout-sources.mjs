import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { readConfig, readJSON, realDirectory } from './config.mjs'

const execute = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
if (args.length > 1 || (args.length === 1 && args[0] !== '--update'))
  throw new Error('usage: node scripts/checkout-sources.mjs [--update]')
const update = args.includes('--update')
const config = await readConfig(root)
let lock = { version: 1, sources: {} }
try { lock = await readJSON(join(root, 'sources.lock.json')) }
catch (error) { if (!update || error.code !== 'ENOENT') throw error }
if (lock.version !== 1 || !lock.sources || typeof lock.sources !== 'object' || Array.isArray(lock.sources))
  throw new Error('Invalid source lock')
const cache = join(root, '.sources')
await mkdir(cache, { recursive: true })
await realDirectory(cache)
const next = { version: 1, sources: {} }
for (const [name, source] of Object.entries(config.skills).sort()) {
  const url = `https://github.com/${source.repository}.git`
  let revision = lock.sources[name]?.revision
  if (update) {
    const { stdout } = await execute('git', ['ls-remote', '--exit-code', url, `refs/heads/${source.ref}`])
    revision = stdout.trim().split(/\s+/)[0]
  } else if (lock.sources[name]?.repository !== source.repository) {
    throw new Error(`Source lock does not match ${name}; run npm run refresh`)
  }
  if (!/^[a-f0-9]{40}$/.test(revision ?? '')) throw new Error(`Invalid source revision for ${name}`)
  const checkout = join(cache, name)
  await mkdir(checkout, { recursive: true })
  await realDirectory(checkout)
  const git = (...arguments_) => execute('git', ['-C', checkout, ...arguments_], { maxBuffer: 4 * 1024 * 1024 })
  await git('init', '--quiet')
  await git('-c', 'core.hooksPath=/dev/null', 'fetch', '--quiet', '--depth=1', '--no-tags', url, revision)
  await git('-c', 'core.hooksPath=/dev/null', 'checkout', '--quiet', '--detach', '--force', revision)
  const actual = (await git('rev-parse', 'HEAD')).stdout.trim()
  if (actual !== revision) throw new Error(`Checkout revision mismatch for ${name}`)
  next.sources[name] = { repository: source.repository, revision }
  console.log(`${source.repository}@${revision}`)
}
// No source package scripts, hooks, build tools, or dependency installers run.
if (update) await writeFile(join(root, 'sources.lock.json'), JSON.stringify(next, null, 2) + '\n')
