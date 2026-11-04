# Licensing and attribution

Copyright © 2026 Victor Duarte <zvictor> and contributors.

This repository contains separately licensed works. The most specific applicable
source notice controls; this map does not replace a license instrument, grant
additional rights, or change an earlier distribution's valid permissions.
Third-party material keeps its own notices and terms.

## Authored instructions and central tooling

| Material in this repository | Applicable terms |
| --- | --- |
| Central build and checkout scripts, tests, workflows, repository metadata, and original repository documentation | [MPL-2.0](LICENSES/MPL-2.0.txt). The shared builder adapts the source projects' MPL-licensed skill tooling. |
| `skills/flow/SKILL.md` and `skills/jig/SKILL.md` | [MPL-2.0](LICENSES/MPL-2.0.txt), retained from their source repositories' residual-material scope. |
| `skills/bonsai/SKILL.md` and `skills/bonsai/references/adoption.md` | [Bonsai's adoption and Bread License 1.0](skills/bonsai/reference/LICENSE.md), with its [component notices](skills/bonsai/reference/LICENSES.md) and [pricing schedule](skills/bonsai/reference/PRICING.md). |
| License instruments and notice files | Their retained source text and applicable terms; the central MPL scope does not relicense them. |

The authored skills were migrated from
[Bonsai](https://github.com/jiggy/bonsai/tree/abbd19c6a7048eb7bca35561ef7c6e6818f34d70/skills/bonsai),
[FLOW](https://github.com/jiggy/flow/tree/f59cffee241abb6ed8df5a527219f357ed0570b0/skills/flow),
and [Jig](https://github.com/jiggy/jig/tree/2804da138ef7095c748c56d86892c3ba15943030/skills/jig).
Their source histories and this repository's subsequent commits identify changes.

## Bundled source material

[`sources.json`](sources.json) lists the exact selected upstream paths.
[`sources.lock.json`](sources.lock.json) identifies the source commit for each
generated bundle. The builder preserves source-relative paths after removing the
configured documentation prefix; notice paths remain relative to their source
repository root.

| Bundled material | Original source scope | Applicable terms |
| --- | --- | --- |
| Bonsai `reference/README.md`, `reference/docs/**`, and `reference/examples/**` | Bonsai's selected first-party documentation and examples | [Bonsai Bread adoption](skills/bonsai/reference/LICENSE.md), subject to the exceptions in [Bonsai's scope notice](skills/bonsai/reference/LICENSES.md). |
| FLOW `reference/guide/**` | `docs/flow/guide/**` | [CC BY 4.0](skills/flow/reference/LICENSES/CC-BY-4.0.txt). |
| FLOW `reference/spec/*.md` and `reference/Notices.md` | Normative specifications and working-group notices | [Community Specification License 1.0](skills/flow/reference/LICENSES/Community-Spec-1.0.md), with the retained [specification notices](skills/flow/reference/Notices.md). |
| FLOW `reference/spec/machine/**` and `reference/spec/examples/**` | Machine schemas and examples | [Apache 2.0](skills/flow/reference/LICENSES/Apache-2.0.txt). |
| Jig `reference/start/**`, `reference/build/**`, `reference/understand/**`, `reference/reference/**`, and `reference/for-agents.md` | Explanatory documentation under the corresponding `docs/jig/` paths | [CC BY 4.0](skills/jig/reference/LICENSES/CC-BY-4.0.txt). |
| Jig `reference/spec/**`, including machine schemas and contracts | `docs/jig/spec/**` | [Jig's Bread adoption](skills/jig/reference/LICENSE.md), with its [scope notice](skills/jig/reference/LICENSES.md) and [pricing schedule](skills/jig/reference/PRICING.md). |

All paths in the first column are within the named `skills/<name>/` directory.
The complete retained mappings are available in the bundled
[Bonsai](skills/bonsai/reference/LICENSES.md),
[FLOW](skills/flow/reference/LICENSES.md), and
[Jig](skills/jig/reference/LICENSES.md) notices. The source version's notices govern
if its licensing scope changes; refresh and review this central map when updating
those inputs.

## Modifications, attribution, and redistribution

Bundled Markdown documentation may have prose navigation links adapted to the
local bundle. Examples, machine JSON, license instruments, and notice files are
copied byte for byte. This identifies the bundler's modifications; it does not
claim that adapted navigation is part of the upstream source edition.

Retained source notices can describe paths and distribution boundaries in the
upstream repository. They are preserved as source records. Use the path map above
and the source registry to locate the corresponding material here.

Keep the skill's complete references and applicable license instruments with its
authored instructions. Preserve attribution, the relevant source revision, and
modification information when redistributing material. Source projects remain
separate software families: a central bundle is not a new Bonsai or Jig official
release and does not combine their purchase coverage or extend an output-only
permission to the bundled software or documentation.

Project names and marks remain subject to their owners' terms; this repository's
licenses provide no additional endorsement or trademark permission.
