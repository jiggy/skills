# Jiggy skills

Agent skills for Bonsai, FLOW, and Jig, maintained and built in one place.
Install ready-to-use skill directories; rebuilding them does not require installing
or running any of the source projects.

## Install

Choose the skills you need:

```sh
npx skills add jiggy/skills --skill bonsai
npx skills add jiggy/skills --skill flow
npx skills add jiggy/skills --skill jig
```

| Skill | Use it for |
| --- | --- |
| [Bonsai](skills/bonsai/SKILL.md) | Adopt a Bonsai gate, implement within its allowance, and resolve rejected or incomplete checks. |
| [FLOW](skills/flow/SKILL.md) | Design, create, compose, adapt, and review portable Flows. |
| [Jig](skills/jig/SKILL.md) | Create, configure, run, and diagnose Jig projects and application integrations. |

For manual installation, copy the complete `skills/<name>/` directory into your
agent's skill location. Keep its references and license files together. Bonsai has
both `references/` for its adoption workflow and `reference/` for bundled source
documentation. An installed skill supplies guidance; it does not install the
product, configure runtime credentials, or authorize execution.

## Ownership

| Material | Owner |
| --- | --- |
| Product behavior, canonical documentation, examples, and license terms | [Bonsai](https://github.com/jiggy/bonsai), [FLOW](https://github.com/jiggy/flow), and [Jig](https://github.com/jiggy/jig). |
| Authored `skills/*/SKILL.md` and Bonsai's `skills/bonsai/references/adoption.md` | This repository. Edit these files directly. |
| Public source selection | [`sources.json`](sources.json), with one entry for each source repository. |
| Source revisions | [`sources.lock.json`](sources.lock.json), with one full commit SHA per source. |
| Bundled `skills/*/reference/` directories | Generated here from the selected source revisions. |
| Build, validation, and notification infrastructure | Shared tooling and workflows in this repository. |

Product PRs change their source documentation and notify this repository. Generated
reference changes stay here. A build updates source references; it does not
automatically rewrite authored skill instructions or decide whether product
changes require new guidance. Review those instructions when behavior changes.

## Build and check

Use Node.js 22 or newer and Git. From a checkout of this repository:

```sh
npm ci --ignore-scripts
npm run sources
npm run build
npm run check
npm test
```

`npm run sources` fetches the revisions in `sources.lock.json` into the ignored
`.sources/` directory. It needs access to the three public GitHub repositories.
After those checkouts are available, `build`, `check`, and `test` use local inputs.
Only this repository's tooling executes; source checkouts are read as data.

| Command | Result |
| --- | --- |
| `npm run sources` | Prepare source checkouts at the committed lock revisions. |
| `npm run build` | Rebuild selected references from those local checkouts. |
| `npm run check` | Validate the authored skills and fail if bundled references differ from the selected inputs. |
| `npm run refresh` | Resolve the source repositories' current `main` commits, update the lock, and rebuild references. |
| `npm test` | Run the central builder and validation regression tests. |

To refresh documentation after source changes merge:

```sh
npm run refresh
npm test
npm run check
git diff -- sources.lock.json skills
```

Review and commit the source lock and generated diff together. Source documentation
reflects the recorded commits, which can differ from current upstream `main`
between refreshes. Match bundled guidance against the product version installed
in the consuming project.

The builder validates selected paths, skill frontmatter, and local skill links
before replacing generated files. It rejects private selected paths, traversal,
symlinks, and missing inputs. Markdown prose links are adapted to the bundle;
examples, machine JSON, and license instruments retain their source bytes.
There are no generation timestamps or per-file checksum manifests. Provenance
comes from the source registry, locked Git commits, and the reviewed central diff.

## Source notifications and recovery

Each source repository's `notify-skills.yml` calls the reusable
[notification workflow](.github/workflows/notify.yml) at a reviewed full commit SHA.
It runs after relevant changes reach `main`, without checking out or executing
source code, and requests no `GITHUB_TOKEN` permissions.

Immediate cross-repository dispatch uses the optional source-repository secret
`SKILLS_DISPATCH_TOKEN`. Use a fine-grained token restricted to **`jiggy/skills`**
with **Contents: write**; pass it to the reusable workflow as `dispatch-token`.
The source repository's default `GITHUB_TOKEN` cannot dispatch to another
repository. Do not broaden source-repository token permissions for this purpose.

The central refresh workflow also runs hourly and can be started manually from
[Actions](https://github.com/jiggy/skills/actions). This path needs no shared
dispatch secret. If the optional secret is absent, the notifier reports that
immediate notification was skipped and scheduled reconciliation remains available.

A notification prompts the central workflow to resolve the allowlisted source
repositories and refs from `sources.json`; payloads cannot choose arbitrary
repositories, commits, paths, or commands. The workflow builds and validates the
result, then commits only the source lock and generated references to central
`main` with its own repository-scoped write permission. Authored instructions,
tooling, and workflow changes go through ordinary pull requests.

For a failed or missed notification, run the central refresh workflow manually,
or use the local refresh commands above. Fix a missing or invalid source input in
its owning repository, or review a source-selection change here, then refresh.
When updating the reusable notifier, update its callers to the reviewed full
commit SHA; a moving branch or tag is not the caller pin.

## Contributing and licensing

Use a topic branch and signed-off commits. Change canonical product documentation
in its source repository; change skill instructions and shared tooling here.
Run the central checks and include generated changes only when their inputs or
the builder change. See [repository instructions](AGENTS.md).

This repository contains separately licensed material. Central tooling and the
authored FLOW/Jig skills use MPL-2.0; Bonsai's skill keeps its Bonsai terms, and
bundled documentation, specifications, and examples retain their source licenses.
See [LICENSE.md](LICENSE.md) and the exact [scope and attribution map](LICENSES.md).
