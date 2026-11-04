import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  lstat, mkdir, mkdtemp, readFile, readdir, readlink, rename, rm, symlink, utimes, writeFile,
} from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { syncSkills } from '../scripts/build.mjs'

const repository = fileURLToPath(new URL('../', import.meta.url))
const builder = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url))
const notices = ['LICENSE.md', 'LICENSES/Terms.txt']
const codeExample = '````markdown\n[Example](missing-example.md)\n```flow\ncall child @input\n```\n````\n'

function specification(name) {
  if (name === 'bonsai') return {
    repository: 'jiggy/bonsai', ref: 'main', docsPrefix: '', siteURL: null,
    references: ['README.md', 'docs/cli.md', 'examples/checkout/bindings.ts', 'examples/checkout/features/checkout.feature'],
    notices: [...notices],
  }
  const docsPrefix = `docs/${name}/`
  return {
    repository: `jiggy/${name}`, ref: 'main', docsPrefix,
    siteURL: name === 'flow' ? 'https://flow.jig.md' : 'https://jig.md',
    references: [
      `${docsPrefix}guide/create.md`, `${docsPrefix}guide/with space.md`,
      `${docsPrefix}spec/package.md`, `${docsPrefix}spec/machine/package.json`,
    ],
    notices: [...notices],
  }
}

function guide(siteURL) {
  return '---\ntitle: Create\n---\n\n# Create\n\n' +
    '[`Package`](../spec/package.md#metadata)\n' +
    `[Canonical](${siteURL}/spec/package#metadata)\n` +
    '[Root](/spec/package.md?view=1#metadata)\n' +
    '[More](more.md?view=full#details)\n' +
    '[Space](with%20space.md#details)\n' +
    '[Source](../../../packages/example/source.ts#L1)\n' +
    '[Directory](../../../packages/example/)\n' +
    '[Work contract](../AGENTS.md)\n' +
    `[Schema](${siteURL}/schemas/package.json#/$defs/item)\n` +
    '[Reference][package]\n\n[package]: ../spec/package.md "Package"\n\n' +
    '<a href="../spec/package.md#metadata">Package HTML link</a>\n\n' +
    '`[Inline example](missing-inline.md)`\n\n' +
    '``An inline `tick` and [link](missing-inline.md)``\n\n' +
    '    [Indented example](missing-indented.md)\n\n' + codeExample
}

async function put(root, path, content) {
  await mkdir(dirname(join(root, path)), { recursive: true })
  await writeFile(join(root, path), content)
}

async function fixture(t, names = ['bonsai', 'flow', 'jig']) {
  await mkdir(join(repository, '.tmp'), { recursive: true })
  const root = await mkdtemp(join(repository, '.tmp', 'skill-build-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const registry = { version: 1, skills: {} }
  for (const name of names) {
    const source = registry.skills[name] = specification(name)
    const upstream = join(root, '.sources', name)
    const entry = name === 'bonsai' ? 'README.md' : 'guide/create.md'
    await put(root, `skills/${name}/SKILL.md`,
      `---\nname: ${name}\ndescription: Use ${name} for authoring.\n---\n\n# ${name}\n\n[Start](reference/${entry})\n[Notes](notes.md)\n`)
    await put(root, `skills/${name}/notes.md`, '# Authored notes\n')
    await put(root, `skills/${name}/agents/openai.yaml`, `interface:\n  display_name: ${name}\n`)
    await put(upstream, 'LICENSE.md', `# ${name} license\r\n\r\n[Exact license example](missing-license-example.md)\r\nCopyright © 2026\r\n`)
    await put(upstream, 'LICENSES/Terms.txt', `Terms for ${name}.\r\nPreserve these bytes.\r\n`)
    await put(upstream, 'scripts/build.mjs',
      "import { writeFileSync } from 'node:fs'; writeFileSync(new URL('../EXECUTED', import.meta.url), 'executed'); throw new Error('Source scripts must not run')\n")
    await put(upstream, 'package.json', JSON.stringify({ scripts: { postinstall: 'node scripts/build.mjs', build: 'node scripts/build.mjs' } }))
    await put(upstream, `skills/${name}/SKILL.md`, 'Invalid upstream skill: central instructions are authoritative.\n')
    if (name === 'bonsai') {
      await put(upstream, 'README.md', '# Bonsai\n\n[CLI](docs/cli.md#commands)\n[More](docs/more.md)\n[Implementation](src/index.ts#L1)\n[Examples](examples/checkout/)\n[Maintenance](AGENTS.md)\n[PR](.github/pull_request_template.md)\n')
      await put(upstream, 'docs/cli.md', '# CLI\n\n## Commands\n\n[Home](../README.md)\n')
      await put(upstream, 'docs/more.md', '# More\n')
      await put(upstream, 'src/index.ts', 'export const value = 1\n')
      await put(upstream, 'examples/checkout/bindings.ts', '// [Not a prose link](missing-example.md)\r\nexport const binding = "checkout"\r\n')
      await put(upstream, 'examples/checkout/features/checkout.feature', 'Feature: Checkout\r\n  Scenario: A literal [link](missing-feature.md)\r\n    Given a basket\r\n')
      await put(upstream, 'AGENTS.md', '# INTERNAL_NOT_FOR_BUNDLE\n')
      await put(upstream, '.github/pull_request_template.md', '# INTERNAL_NOT_FOR_BUNDLE\n')
    } else {
      await put(upstream, `${source.docsPrefix}guide/create.md`, guide(source.siteURL))
      await put(upstream, `${source.docsPrefix}AGENTS.md`, '# INTERNAL_NOT_FOR_BUNDLE\n')
      await put(upstream, `${source.docsPrefix}guide/more.md`, '# More\n\n## Details\n')
      await put(upstream, `${source.docsPrefix}guide/with space.md`, '# A named guide\n\n## Details\n')
      await put(upstream, `${source.docsPrefix}spec/package.md`, '# Package\n\n## Metadata\n\n[Create](../guide/create.md)\n')
      await put(upstream, `${source.docsPrefix}spec/machine/package.json`, ` { "$id" : "${source.siteURL}/schemas/package.json", "type" : "object" }\r\n`)
      await put(upstream, 'packages/example/source.ts', 'export const example = 1\n')
    }
  }
  await put(root, 'sources.json', JSON.stringify(registry, null, 2) + '\n')
  return { root, registry }
}

async function snapshot(root, { metadata = false } = {}) {
  const result = []
  async function visit(prefix) {
    for (const name of (await readdir(join(root, prefix))).sort()) {
      const path = join(prefix, name)
      const stat = await lstat(join(root, path))
      if (stat.isSymbolicLink()) result.push([path, 'symlink', await readlink(join(root, path))])
      else if (stat.isDirectory()) await visit(path)
      else result.push([path, (await readFile(join(root, path))).toString('base64'), ...(metadata ? [stat.mtimeMs, stat.ino] : [])])
    }
  }
  await visit('')
  return result
}

async function noOutputs(root, names) {
  for (const name of names) await assert.rejects(lstat(join(root, 'skills', name, 'reference')), { code: 'ENOENT' })
}

async function saveRegistry(root, registry) {
  await put(root, 'sources.json', JSON.stringify(registry, null, 2) + '\n')
}

test('builds standalone bundles for all projects without changing source or authored resources', async (t) => {
  const { root, registry } = await fixture(t)
  const beforeSources = await snapshot(join(root, '.sources'))
  const beforeAuthored = await snapshot(join(root, 'skills'))
  const changed = await syncSkills({ root })
  assert.ok(changed.length > 0)
  assert.deepEqual(changed, [...changed].sort())
  assert.deepEqual(await snapshot(join(root, '.sources')), beforeSources)
  assert.deepEqual((await snapshot(join(root, 'skills'))).filter(([path]) => !path.includes('/reference/')), beforeAuthored)
  for (const [name, source] of Object.entries(registry.skills)) {
    const output = join(root, 'skills', name, 'reference')
    assert.deepEqual((await snapshot(output)).map(([path]) => path).sort(),
      [...source.references.map(path => path.slice(source.docsPrefix.length)), ...source.notices].sort())
    for (const path of source.notices) assert.deepEqual(await readFile(join(output, path)), await readFile(join(root, '.sources', name, path)))
  }
  for (const name of ['flow', 'jig']) {
    const source = registry.skills[name]
    const output = join(root, 'skills', name, 'reference')
    const generated = await readFile(join(output, 'guide/create.md'), 'utf8')
    assert.ok(generated.startsWith('---\ntitle: Create\n---\n\n# Create\n'))
    for (const expected of [
      '[`Package`](../spec/package.md#metadata)',
      '[Canonical](../spec/package.md#metadata)',
      '[Root](../spec/package.md?view=1#metadata)',
      `[More](${source.siteURL}/guide/more.md?view=full#details)`,
      '[Space](with%20space.md#details)',
      `[Source](https://github.com/jiggy/${name}/blob/main/packages/example/source.ts#L1)`,
      `[Directory](https://github.com/jiggy/${name}/tree/main/packages/example)`,
      `[Work contract](https://github.com/jiggy/${name}/blob/main/docs/${name}/AGENTS.md)`,
      '[Schema](../spec/machine/package.json#/$defs/item)',
      '[package]: ../spec/package.md "Package"',
      '<a href="../spec/package.md#metadata">Package HTML link</a>',
      '`[Inline example](missing-inline.md)`',
      '``An inline `tick` and [link](missing-inline.md)``',
      '    [Indented example](missing-indented.md)', codeExample,
    ]) assert.ok(generated.includes(expected), `${name}: missing ${expected}`)
    assert.deepEqual(await readFile(join(output, 'spec/machine/package.json')), await readFile(join(root, '.sources', name, `${source.docsPrefix}spec/machine/package.json`)))
  }
  const bonsai = await readFile(join(root, 'skills/bonsai/reference/README.md'), 'utf8')
  for (const expected of [
    '[CLI](docs/cli.md#commands)',
    '[More](https://github.com/jiggy/bonsai/blob/main/docs/more.md)',
    '[Implementation](https://github.com/jiggy/bonsai/blob/main/src/index.ts#L1)',
    '[Examples](https://github.com/jiggy/bonsai/tree/main/examples/checkout)',
    '[Maintenance](https://github.com/jiggy/bonsai/blob/main/AGENTS.md)',
    '[PR](https://github.com/jiggy/bonsai/blob/main/.github/pull_request_template.md)',
  ]) assert.ok(bonsai.includes(expected), `bonsai: missing ${expected}`)
  assert.doesNotMatch(bonsai, /INTERNAL_NOT_FOR_BUNDLE/)
  assert.match(await readFile(join(root, 'skills/bonsai/reference/docs/cli.md'), 'utf8'), /\[Home\]\(\.\.\/README\.md\)/)
  for (const path of registry.skills.bonsai.references.filter(path => /\.(?:ts|feature)$/.test(path))) {
    assert.deepEqual(await readFile(join(root, 'skills/bonsai/reference', path)), await readFile(join(root, '.sources/bonsai', path)))
  }
  const complete = await snapshot(join(root, 'skills'))
  await rm(join(root, '.sources'), { recursive: true })
  assert.deepEqual(await snapshot(join(root, 'skills')), complete)
})

test('check is read-only for missing or stale output, and normal generation is idempotent', async (t) => {
  const { root } = await fixture(t, ['jig'])
  const initial = await snapshot(root)
  await assert.rejects(syncSkills({ root, check: true }), /Skill references are stale/)
  assert.deepEqual(await snapshot(root), initial)
  await noOutputs(root, ['jig'])
  await syncSkills({ root })
  const target = join(root, 'skills/jig/reference/guide/create.md')
  await utimes(target, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'))
  const original = await snapshot(join(root, 'skills'), { metadata: true })
  assert.deepEqual(await syncSkills({ root, check: true }), [])
  assert.deepEqual(await syncSkills({ root }), [])
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), original)
  await put(root, '.sources/jig/docs/jig/guide/create.md', guide('https://jig.md') + '\nNew canonical guidance.\n')
  await assert.rejects(syncSkills({ root, check: true }), /skills\/jig\/reference\/guide\/create\.md/)
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), original)
  assert.deepEqual(await syncSkills({ root }), ['skills/jig/reference/guide/create.md'])
  assert.match(await readFile(target, 'utf8'), /New canonical guidance/)
  assert.deepEqual(await syncSkills({ root, check: true }), [])
})

test('registry formatting and ordering do not create generated churn', async (t) => {
  const { root, registry } = await fixture(t)
  await syncSkills({ root })
  const original = await snapshot(join(root, 'skills'), { metadata: true })
  const reordered = Object.fromEntries(Object.entries(registry.skills).reverse().map(([name, source]) => [name, { ...source, references: [...source.references].reverse(), notices: [...source.notices].reverse() }]))
  await put(root, 'sources.json', JSON.stringify({ skills: reordered, version: 1 }))
  assert.deepEqual(await syncSkills({ root, check: true }), [])
  assert.deepEqual(await syncSkills({ root }), [])
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), original)
})

test('an explicit separate source root is read as data and never receives generated output', async (t) => {
  const { root } = await fixture(t, ['jig'])
  const sourcesRoot = join(root, 'upstream-checkouts')
  await rename(join(root, '.sources'), sourcesRoot)
  const before = await snapshot(sourcesRoot)
  await syncSkills({ root, sourcesRoot })
  assert.deepEqual(await syncSkills({ root, sourcesRoot, check: true }), [])
  assert.deepEqual(await snapshot(sourcesRoot), before)
  await assert.rejects(lstat(join(root, '.sources')), { code: 'ENOENT' })
  assert.match(await readFile(join(root, 'skills/jig/reference/guide/create.md'), 'utf8'), /# Create/)
})

test('the central CLI ignores source scripts and rejects malformed arguments without writing', async (t) => {
  const { root } = await fixture(t)
  await put(root, 'scripts/build.mjs', "throw new Error('Only the central trusted builder may execute')\n")
  const before = await snapshot(join(root, '.sources'))
  const run = (...args) => spawnSync(process.execPath, [builder, ...args], { encoding: 'utf8', timeout: 10000 })
  const build = run('--root', root)
  assert.equal(build.status, 0, build.stderr)
  assert.match(build.stdout, /Synchronized/)
  const check = run('--check', '--root', root)
  assert.equal(check.status, 0, check.stderr)
  assert.match(check.stdout, /references are current/)
  assert.deepEqual(await snapshot(join(root, '.sources')), before)
  const generated = await snapshot(join(root, 'skills'), { metadata: true })
  for (const args of [['--root'], ['--root', root, '--root', root], ['--check', '--check'], ['--unknown']]) {
    const refused = run(...args)
    assert.equal(refused.status, 1, refused.stderr)
    assert.match(refused.stderr, /usage:/)
  }
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), generated)
})

test('invalid input in the last project prevents initial output for every project', async (t) => {
  const { root } = await fixture(t)
  await rm(join(root, '.sources/jig/docs/jig/spec/package.md'))
  await assert.rejects(syncSkills({ root }), /Missing source/)
  await noOutputs(root, ['bonsai', 'flow', 'jig'])
})

test('invalid later source or prose links prevent updates to every existing bundle', async (t) => {
  const { root } = await fixture(t)
  await syncSkills({ root })
  const before = await snapshot(join(root, 'skills'), { metadata: true })
  await put(root, '.sources/bonsai/README.md', '# Changed Bonsai guidance\n')
  await rm(join(root, '.sources/jig/docs/jig/spec/package.md'))
  await assert.rejects(syncSkills({ root }), /Missing source/)
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), before)
  await put(root, '.sources/jig/docs/jig/spec/package.md', '# Package\n\n[Missing](unknown.md)\n')
  await assert.rejects(syncSkills({ root }), /Missing source/)
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), before)
})

test('an unsafe later output prevents earlier project updates and preserves the link target', async (t) => {
  const { root } = await fixture(t)
  await syncSkills({ root })
  await put(root, 'outside/keep.txt', 'retain outside output')
  await symlink(join(root, 'outside'), join(root, 'skills/jig/reference/outside'))
  const before = await snapshot(join(root, 'skills'), { metadata: true })
  await put(root, '.sources/bonsai/README.md', '# Changed Bonsai guidance\n')
  await assert.rejects(syncSkills({ root }), /symbolic link/)
  assert.deepEqual(await snapshot(join(root, 'skills'), { metadata: true }), before)
  assert.equal(await readFile(join(root, 'outside/keep.txt'), 'utf8'), 'retain outside output')
})

test('repairs drift and removes obsolete files only inside selected generated subtrees', async (t) => {
  const { root, registry } = await fixture(t, ['jig'])
  await syncSkills({ root })
  await put(root, 'skills/jig/manual.txt', 'authored resource')
  await put(root, 'skills/unselected/reference/keep.txt', 'unselected skill resource')
  await put(root, 'outside/keep.txt', 'unrelated resource')
  const authored = await snapshot(join(root, 'skills'))
  await put(root, 'skills/jig/reference/stale/nested/old.md', 'obsolete')
  await put(root, 'skills/jig/reference/provenance.json', 'obsolete checksum manifest')
  await put(root, 'skills/jig/reference/guide/create.md', 'manual drift')
  await rm(join(root, 'skills/jig/reference/spec/package.md'))
  registry.skills.jig.references = registry.skills.jig.references.filter(path => !path.endsWith('machine/package.json'))
  await saveRegistry(root, registry)
  await assert.rejects(syncSkills({ root, check: true }), /Skill references are stale/)
  const changes = await syncSkills({ root })
  for (const path of ['stale/nested/old.md', 'provenance.json', 'spec/machine/package.json', 'guide/create.md', 'spec/package.md']) {
    assert.ok(changes.includes(`skills/jig/reference/${path}`), path)
  }
  for (const path of ['stale', 'provenance.json', 'spec/machine']) {
    await assert.rejects(lstat(join(root, 'skills/jig/reference', path)), { code: 'ENOENT' })
  }
  assert.deepEqual((await snapshot(join(root, 'skills'))).filter(([path]) => !path.startsWith('jig/reference/')), authored.filter(([path]) => !path.startsWith('jig/reference/')))
  assert.equal(await readFile(join(root, 'outside/keep.txt'), 'utf8'), 'unrelated resource')
  assert.deepEqual(await syncSkills({ root, check: true }), [])
})

test('obsolete provenance alone fails check mode and normal generation removes it', async (t) => {
  const { root } = await fixture(t, ['jig'])
  await syncSkills({ root })
  await put(root, 'skills/jig/reference/provenance.json', '{}\n')
  await assert.rejects(syncSkills({ root, check: true }), /Skill references are stale:\nskills\/jig\/reference\/provenance\.json\n/)
  assert.deepEqual(await syncSkills({ root }), ['skills/jig/reference/provenance.json'])
  assert.deepEqual(await syncSkills({ root, check: true }), [])
})

test('skill metadata rejects invalid YAML and required fields, and accepts folded descriptions', async (t) => {
  const { root } = await fixture(t, ['jig'])
  for (const invalid of [
    '---\nname: jig\ndescription: Missing closing delimiter\n',
    '---\nname: jig\nname: jig\ndescription: Duplicate key\n---\n',
    '---\nname: jig\ndescription: [unclosed sequence\n---\n',
    '---\nname: flow\ndescription: Wrong skill\n---\n',
    '---\nname: 42\ndescription: Invalid name\n---\n',
    '---\nname: jig\ndescription: null\n---\n',
    '---\nname: jig\ndescription: " "\n---\n',
    `---\nname: jig\ndescription: ${'x'.repeat(1025)}\n---\n`,
  ]) {
    await put(root, 'skills/jig/SKILL.md', invalid)
    await assert.rejects(syncSkills({ root }), /SKILL\.md needs/)
    await noOutputs(root, ['jig'])
  }
  await put(root, 'skills/jig/SKILL.md', '---\nname: "jig"\ndescription: >-\n  Jig projects\n  and review.\ndisable-model-invocation: true\n---\n\n# Jig\n')
  assert.ok((await syncSkills({ root })).length > 0)
})

test('authored links must stay in their skill and name selected or authored resources', async (t) => {
  const { root } = await fixture(t, ['jig'])
  for (const target of ['../../sources.json', '../flow/SKILL.md', '%2e%2e/%2e%2e/sources.json', 'reference/guide/more.md', 'missing.md']) {
    await put(root, 'skills/jig/SKILL.md', `---\nname: jig\ndescription: Jig authoring.\n---\n\n[Read](${target})\n`)
    await assert.rejects(syncSkills({ root }), /link must stay inside the skill|reference is missing from the manifest|Missing source/)
    await noOutputs(root, ['jig'])
  }
})

test('the registry rejects foreign repositories, refs, invalid shapes, private selection, and output collisions', async (t) => {
  const { root, registry } = await fixture(t, ['jig'])
  const invalid = [
    { version: 2, skills: registry.skills }, { version: 1, skills: {} },
    { version: 1, skills: [] }, { version: 1, skills: { unknown: registry.skills.jig } },
  ]
  for (const update of [
    { repository: 'other/jig' }, { repository: 'jiggy/flow' }, { ref: 'feature' },
    { siteURL: 'https://other.invalid' }, { docsPrefix: '../' },
    { references: [] }, { notices: [] },
    { references: ['docs/jig/AGENTS.md'] }, { references: ['docs/jig/.private.md'] },
    { references: ['docs/jig/../secret.md'] }, { references: ['/etc/secret.md'] },
    { references: ['docs/jig/back\\slash.md'] }, { references: ['docs/jig/nul\0.md'] },
    { references: ['docs/jig/script.mjs'] },
    { references: [registry.skills.jig.references[0], registry.skills.jig.references[0]] },
    { notices: ['AGENTS.md'] }, { notices: ['.github/pull_request_template.md'] },
    { references: ['docs/jig/LICENSE.md'], notices: ['LICENSE.md'] },
  ]) invalid.push({ version: 1, skills: { jig: { ...registry.skills.jig, ...update } } })
  for (const config of invalid) {
    await saveRegistry(root, config)
    await assert.rejects(syncSkills({ root }))
    await noOutputs(root, ['jig'])
  }
})

test('the source registry cannot be supplied through a symbolic link', async (t) => {
  const { root } = await fixture(t, ['jig'])
  await rename(join(root, 'sources.json'), join(root, 'linked-registry.json'))
  await symlink('linked-registry.json', join(root, 'sources.json'))
  await assert.rejects(syncSkills({ root }), /symbolic link|regular file/)
  await noOutputs(root, ['jig'])
})

for (const kind of ['source cache', 'source checkout', 'source ancestor', 'source file']) {
  test(`rejects a symbolic link at the ${kind} boundary`, async (t) => {
    const { root } = await fixture(t, ['jig'])
    let path
    if (kind === 'source cache') path = join(root, '.sources')
    else if (kind === 'source checkout') path = join(root, '.sources/jig')
    else if (kind === 'source ancestor') path = join(root, '.sources/jig/docs')
    else path = join(root, '.sources/jig/docs/jig/spec/package.md')
    const retained = join(root, 'retained-source')
    await rename(path, retained)
    await symlink(retained, path)
    const before = kind === 'source file' ? await readFile(retained) : await snapshot(retained)
    await assert.rejects(syncSkills({ root }), /symbolic link|real directory/)
    await noOutputs(root, ['jig'])
    assert.deepEqual(kind === 'source file' ? await readFile(retained) : await snapshot(retained), before)
  })
}

for (const kind of ['skills ancestor', 'skill directory', 'reference root', 'nested file']) {
  test(`rejects a symbolic link at the ${kind} output boundary`, async (t) => {
    const { root } = await fixture(t, ['jig'])
    await syncSkills({ root })
    const path = join(root, kind === 'skills ancestor' ? 'skills' : kind === 'skill directory' ? 'skills/jig' : kind === 'reference root' ? 'skills/jig/reference' : 'skills/jig/reference/guide/create.md')
    const retained = join(root, 'retained-output')
    await rename(path, retained)
    await symlink(retained, path)
    const before = kind === 'nested file' ? await readFile(retained) : await snapshot(retained)
    await put(root, '.sources/jig/docs/jig/guide/create.md', '# A changed source\n')
    await assert.rejects(syncSkills({ root }), /symbolic link|real directory/)
    assert.deepEqual(kind === 'nested file' ? await readFile(retained) : await snapshot(retained), before)
  })
}

test('malformed JSON, invalid UTF-8, and non-file sources refuse before output creation', async (t) => {
  for (const kind of ['json', 'markdown', 'skill', 'directory']) {
    const { root } = await fixture(t, ['jig'])
    if (kind === 'json') await put(root, '.sources/jig/docs/jig/spec/machine/package.json', '{invalid')
    else if (kind === 'markdown') await put(root, '.sources/jig/docs/jig/guide/create.md', Buffer.from([255]))
    else if (kind === 'skill') await put(root, 'skills/jig/SKILL.md', Buffer.from([255]))
    else {
      await rm(join(root, '.sources/jig/docs/jig/spec/package.md'))
      await mkdir(join(root, '.sources/jig/docs/jig/spec/package.md'))
    }
    await assert.rejects(syncSkills({ root }))
    await noOutputs(root, ['jig'])
  }
})

test('escaping source links, malformed URL encoding, and symbolic link targets refuse without writing', async (t) => {
  for (const target of ['../../../../outside.md', '%2e%2e/%2e%2e/%2e%2e/%2e%2e/outside.md', '%invalid', 'linked.md']) {
    const { root } = await fixture(t, ['jig'])
    await put(root, 'outside.md', '# Outside source root\n')
    await put(root, '.sources/jig/docs/jig/guide/create.md', `# Create\n\n[Read](${target})\n`)
    if (target === 'linked.md') await symlink(join(root, 'outside.md'), join(root, '.sources/jig/docs/jig/guide/linked.md'))
    await assert.rejects(syncSkills({ root }), /Invalid public source path|invalid link encoding|symbolic link/)
    await noOutputs(root, ['jig'])
    assert.equal(await readFile(join(root, 'outside.md'), 'utf8'), '# Outside source root\n')
  }
})
