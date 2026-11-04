import { lstat, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const repositories = Object.freeze({
  bonsai: 'jiggy/bonsai',
  flow: 'jiggy/flow',
  jig: 'jiggy/jig',
})

export function safePath(path, { repositoryLink = false } = {}) {
  return typeof path === 'string' && !path.includes('\\') && !path.includes('\0') &&
    path.split('/').every(part => part && part !== '.' && part !== '..' &&
      (repositoryLink || (!part.startsWith('.') && part !== 'AGENTS.md')))
}

export async function readJSON(path) {
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Configuration must be a regular file, not a symbolic link: ${path}`)
  return JSON.parse(await readFile(path, 'utf8'))
}

export async function readConfig(root) {
  const config = await readJSON(join(root, 'sources.json'))
  if (config?.version !== 1 || !config.skills || typeof config.skills !== 'object' ||
      Array.isArray(config.skills) || !Object.keys(config.skills).length)
    throw new Error('Expected a version 1 source registry')
  for (const [name, source] of Object.entries(config.skills)) {
    if (!Object.hasOwn(repositories, name) || source.repository !== repositories[name] || source.ref !== 'main')
      throw new Error(`Unapproved source repository or branch: ${name}`)
    if (typeof source.docsPrefix !== 'string' ||
        (source.docsPrefix !== '' && (!source.docsPrefix.endsWith('/') ||
          !safePath(source.docsPrefix.slice(0, -1)))))
      throw new Error(`Invalid documentation prefix for ${name}`)
    if (source.siteURL !== null && !/^https:\/\/(?:flow\.)?jig\.md$/.test(source.siteURL))
      throw new Error(`Invalid documentation site for ${name}`)
    if (!Array.isArray(source.references) || !source.references.length ||
        !Array.isArray(source.notices) || !source.notices.length)
      throw new Error(`Expected references and notices for ${name}`)
    const paths = [...source.references, ...source.notices]
    if (new Set(paths).size !== paths.length || paths.some(path => !safePath(path)) ||
        source.references.some(path => !path.startsWith(source.docsPrefix) || !/\.(?:md|json|ts|feature)$/.test(path)))
      throw new Error(`Invalid or repeated public sources for ${name}`)
    const destinations = [...source.references.map(path => path.slice(source.docsPrefix.length)), ...source.notices]
    if (new Set(destinations).size !== destinations.length || destinations.some(path => !safePath(path)))
      throw new Error(`Colliding or invalid reference destinations for ${name}`)
  }
  return config
}

export async function realDirectory(path) {
  const stat = await lstat(path)
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error(`Expected a real directory: ${path}`)
}
