# Repository instructions

## Purpose and ownership

Publish the Bonsai, FLOW, and Jig agent skills from one repository. Source projects
own their product behavior, documentation, and license terms. This repository
owns authored skill instructions, the public source selection, deterministic
bundling, and distribution. Keep the three projects independent.

## Work contracts

- Edit authored instructions in `skills/*/SKILL.md` and authored resources next
  to them. `skills/*/reference/` is generated; change the canonical source or
  `sources.json` and rebuild it.
- Keep one shared builder and notification workflow. Do not restore generated
  bundles or build infrastructure to source repositories.
- Run only central tooling. Read source checkouts as data; do not install their
  dependencies, execute their scripts, or accept arbitrary payload repositories,
  revisions, commands, or paths.
- Preserve source license instruments and attribution. `LICENSES.md` maps
  ownership and terms; there is no blanket relicensing of bundled material.
- Keep source revisions in `sources.lock.json`; do not add timestamps or per-file
  checksum manifests to generated references.
- Validate every selected input and output directory before writing any bundle.
  Reject private paths, traversal, symlinks, broken skill links, and invalid YAML.
- Keep examples, machine JSON, and license instruments byte-for-byte intact.
  Rewrite only prose links in selected Markdown documentation.
- Use topic branches and signed-off commits for subsequent changes; leave PR
  merging to the maintainer. The serialized refresh workflow may commit only the
  generated reference directories and source lock directly to `main`, after
  validation, using a normal fast-forward push. Pin third-party Actions and
  reusable workflow callers to full commits. Use the least required permissions.
- Update this contract and the README when ownership, inputs, or workflows change.

## Verification

Use Node 22 or newer. Run `npm ci --ignore-scripts`, `npm test`, `npm run sources`,
and `npm run check` for a reproducible build at the committed source revisions.
Use `npm run refresh` to resolve current source `main` revisions and rebuild;
review the generated diff and source lock before committing.
