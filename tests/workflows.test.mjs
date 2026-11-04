import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { parse } from 'yaml'

const root = fileURLToPath(new URL('../', import.meta.url))
const workflow = async (name) =>
  parse(await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'))

async function fixture(t) {
  const temporary = join(root, '.tmp')
  await mkdir(temporary, { recursive: true })
  const directory = await mkdtemp(join(temporary, 'workflow-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

function bash(script, directory, env) {
  return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
    cwd: directory,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, TMPDIR: directory, ...env },
  })
}

test('workflows pin Actions and keep pull requests outside publication authority', async () => {
  for (const name of ['ci', 'notify', 'refresh']) {
    const config = await workflow(name)
    assert.ok(config.on, `${name} needs GitHub YAML 1.2 trigger keys`)
    assert.equal(config.on.pull_request_target, undefined)
    for (const job of Object.values(config.jobs)) {
      for (const step of job.steps ?? []) {
        if (step.uses) assert.match(step.uses, /^[\w-]+\/[\w-]+@[a-f0-9]{40}$/)
      }
    }
  }

  const ci = await workflow('ci')
  assert.ok(Object.hasOwn(ci.on, 'pull_request'))
  assert.deepEqual(ci.on.push.branches, ['main'])
  assert.deepEqual(ci.permissions, { contents: 'read' })
  assert.equal(ci.jobs.check.permissions, undefined)
  const steps = ci.jobs.check.steps
  assert.equal(steps[0].with['persist-credentials'], false)
  assert.equal(steps[1].with['node-version'], '22')
  assert.deepEqual(steps.filter((step) => step.run).map((step) => step.run), [
    'npm ci --ignore-scripts',
    'npm test',
    'npm run sources',
    'npm run check',
  ])
  assert.doesNotMatch(JSON.stringify(ci), /secrets\.|GH_TOKEN|git push|npm run refresh/)
})

test('refresh serializes trusted main rebuilds and ignores dispatch payloads', async () => {
  const refresh = await workflow('refresh')
  assert.deepEqual(refresh.on.repository_dispatch.types, ['source-updated'])
  assert.ok(Object.hasOwn(refresh.on, 'workflow_dispatch'))
  assert.deepEqual(refresh.on.schedule, [{ cron: '17 * * * *' }])
  assert.deepEqual(refresh.on.push.branches, ['main'])
  assert.equal(refresh.on.pull_request, undefined)
  assert.deepEqual(refresh.concurrency, { group: 'skills-refresh', 'cancel-in-progress': false })
  const job = refresh.jobs.refresh
  assert.equal(job.if, "github.repository == 'jiggy/skills' && github.ref == 'refs/heads/main'")
  assert.deepEqual(job.permissions, { contents: 'write' })
  const steps = job.steps
  assert.equal(steps[0].with.ref, 'main')
  assert.equal(steps[0].with['persist-credentials'], false)
  assert.equal(steps[1].with['node-version'], '22')
  assert.deepEqual(steps.slice(2, -1).map((step) => step.run), [
    'npm ci --ignore-scripts',
    'npm test',
    'npm run refresh',
    'npm run check',
  ])
  for (const step of steps.slice(0, -1)) assert.equal(step.env?.GH_TOKEN, undefined)
  const publish = steps.at(-1)
  assert.equal(publish.env.GH_TOKEN, '${{ github.token }}')
  assert.ok(publish.run.includes("git add -- sources.lock.json ':(glob)skills/*/reference/**'"))
  assert.ok(publish.run.includes('commit --signoff'))
  assert.ok(publish.run.includes('git push origin HEAD:refs/heads/main'))
  assert.doesNotMatch(publish.run, /--force|git rebase/)
  assert.doesNotMatch(JSON.stringify(refresh), /client_payload|github\.event\.(?:repository|sender)|secrets\./)
})

test('the reusable notifier has no checkout, inputs, or repository token authority', async () => {
  const notify = await workflow('notify')
  assert.deepEqual(Object.keys(notify.on), ['workflow_call'])
  assert.equal(notify.on.workflow_call.inputs, undefined)
  assert.equal(notify.on.workflow_call.secrets['dispatch-token'].required, false)
  assert.deepEqual(notify.permissions, {})
  const job = notify.jobs.notify
  assert.equal(job.permissions, undefined)
  assert.deepEqual(job.env, {
    SOURCE_REPOSITORY: '${{ github.repository }}',
    SOURCE_REF: '${{ github.ref }}',
    SOURCE_SHA: '${{ github.sha }}',
  })
  assert.equal(job.steps.length, 2)
  assert.ok(job.steps.every((step) => !step.uses && step.shell === 'bash'))
  assert.equal(job.steps[0].env, undefined)
  assert.equal(job.steps[1].env.GH_TOKEN, "${{ secrets['dispatch-token'] }}")
  assert.doesNotMatch(JSON.stringify(notify), /checkout@|github\.token|secrets\.GITHUB_TOKEN|client_payload\./)
})

async function notify(t, {
  repository = 'jiggy/flow',
  ref = 'refs/heads/main',
  sha = 'a'.repeat(40),
  token = 'test-token',
  apiStatus = 0,
} = {}) {
  const directory = await fixture(t)
  const args = join(directory, 'args')
  const input = join(directory, 'input')
  const summary = join(directory, 'summary')
  await writeFile(summary, '')
  const config = await workflow('notify')
  const mock = String.raw`
gh() {
  printf '%s\0' "$@" > "$MOCK_ARGS"
  cat > "$MOCK_INPUT"
  return "$MOCK_API_STATUS"
}
`
  const script = [config.jobs.notify.steps[0].run, mock, config.jobs.notify.steps[1].run].join('\n')
  const result = bash(script, directory, {
    SOURCE_REPOSITORY: repository,
    SOURCE_REF: ref,
    SOURCE_SHA: sha,
    GH_TOKEN: token,
    GITHUB_STEP_SUMMARY: summary,
    MOCK_ARGS: args,
    MOCK_INPUT: input,
    MOCK_API_STATUS: String(apiStatus),
  })
  return { ...result, args, input, summary }
}

test('source main notifications post JSON to the fixed skills endpoint', async (t) => {
  for (const repository of ['jiggy/bonsai', 'jiggy/flow', 'jiggy/jig']) {
    const result = await notify(t, { repository })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual((await readFile(result.args, 'utf8')).split('\0').slice(0, -1), [
      'api', '--method', 'POST', 'repos/jiggy/skills/dispatches',
      '-H', 'Accept: application/vnd.github+json', '--input', '-',
    ])
    assert.deepEqual(JSON.parse(await readFile(result.input, 'utf8')), {
      event_type: 'source-updated',
      client_payload: { repository, sha: 'a'.repeat(40) },
    })
    assert.match(await readFile(result.summary, 'utf8'), /Requested a skill refresh/)
    assert.doesNotMatch(result.stdout + result.stderr, /test-token/)
  }
})

test('unknown repositories, non-main refs, and invalid SHAs fail before dispatch', async (t) => {
  for (const input of [
    { repository: 'someone/flow' },
    { repository: 'jiggy/skills' },
    { repository: 'jiggy/flow; echo unexpected' },
    { ref: 'refs/heads/topic' },
    { ref: 'refs/tags/main' },
    { sha: 'main' },
  ]) {
    const result = await notify(t, input)
    assert.notEqual(result.status, 0)
    assert.equal(existsSync(result.args), false)
    assert.equal(await readFile(result.summary, 'utf8'), '')
  }
})

test('missing credentials report the scheduled fallback without sending a request', async (t) => {
  const result = await notify(t, { token: '' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(existsSync(result.args), false)
  assert.match(result.stdout, /::warning::SKILLS_DISPATCH_TOKEN/)
  assert.match(await readFile(result.summary, 'utf8'), /Hourly reconciliation/)
})

test('API failures fail notification instead of reporting success', async (t) => {
  const result = await notify(t, { apiStatus: 1 })
  assert.notEqual(result.status, 0)
  assert.equal(await readFile(result.summary, 'utf8'), '')
})

async function publish(t, staged, pushStatus = 0) {
  const directory = await fixture(t)
  const changes = join(directory, 'staged')
  const calls = join(directory, 'calls')
  const summary = join(directory, 'summary')
  await writeFile(changes, staged.map((path) => path + '\0').join(''))
  await writeFile(calls, '')
  await writeFile(summary, '')
  const config = await workflow('refresh')
  const mock = String.raw`
git() {
  case "$1" in
    add) printf 'stage\n' >> "$MOCK_CALLS" ;;
    diff)
      if [[ "$3" == '--quiet' ]]; then test ! -s "$MOCK_STAGED"; return; fi
      cat "$MOCK_STAGED" ;;
    -c) printf 'commit\n' >> "$MOCK_CALLS" ;;
    push) printf 'push\n' >> "$MOCK_CALLS"; return "$MOCK_PUSH_STATUS" ;;
    *) return 2 ;;
  esac
}
gh() { printf 'authenticate\n' >> "$MOCK_CALLS"; }
`
  const result = bash(mock + '\n' + config.jobs.refresh.steps.at(-1).run, directory, {
    GH_TOKEN: 'test-token',
    GITHUB_STEP_SUMMARY: summary,
    MOCK_STAGED: changes,
    MOCK_CALLS: calls,
    MOCK_PUSH_STATUS: String(pushStatus),
  })
  return { ...result, calls: await readFile(calls, 'utf8'), summary: await readFile(summary, 'utf8') }
}

test('publication permits only source locks and generated references', async (t) => {
  const permitted = await publish(t, ['sources.lock.json', 'skills/flow/reference/guide/design.md'])
  assert.equal(permitted.status, 0, permitted.stderr)
  assert.equal(permitted.calls, 'stage\ncommit\nauthenticate\npush\n')
  assert.match(permitted.summary, /Published refreshed/)

  for (const path of ['README.md', 'skills/flow/SKILL.md', 'skills/flow/extra/reference/file.md']) {
    const refused = await publish(t, ['sources.lock.json', path])
    assert.notEqual(refused.status, 0)
    assert.equal(refused.calls, 'stage\n')
    assert.match(refused.stderr, /Refusing to publish unrelated staged path/)
  }
})

test('unchanged references do not commit and concurrent main changes cannot force a push', async (t) => {
  const unchanged = await publish(t, [])
  assert.equal(unchanged.status, 0, unchanged.stderr)
  assert.equal(unchanged.calls, 'stage\n')
  assert.match(unchanged.summary, /are current/)

  const raced = await publish(t, ['sources.lock.json'], 1)
  assert.notEqual(raced.status, 0)
  assert.equal(raced.calls, 'stage\ncommit\nauthenticate\npush\n')
  assert.equal(raced.summary, '')
})
