# Release 0.1.0

## User changes

- Local Next.js App Router and Supabase analysis without running application code.
- Feature and data maps, 12 checks, copyable fix prompts, health and local history.
- JSON output, nonzero critical-check exits, Git-ref diffs, and standalone HTML reports.
- Rules synchronized to coding agents while preserving existing instructions.
- Optional validated agent/API explanations, with no source code in provider requests.
- One installable package containing the CLI, core, and production web assets.

Read [usage and limits](USAGE.md) before treating results as a release decision.
This first release detects known patterns; it does not certify project security.

## Maintainer procedure

Workspace packages stay private. Only the generated package is publishable.
No new bundler is needed: the packaging script copies emitted core and web assets
beside the CLI and rewrites the CLI's core imports to relative paths. The published
manifest has ordinary pinned registry dependencies, with no workspace references.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm release:pack
pnpm release:smoke
```

The smoke test installs the tarball using npm with an isolated cache, outside the
workspace. It checks help/version, good and bad scans and exit codes, diff, repeated
sync, the default dashboard command, browser assets, and npm exec from an empty
folder. It never starts the analyzed app or uploads its code.

Review `artifacts/overseer-cli-0.1.0.tgz` and its npm pack file list. Wait for all
four remote CI jobs at the intended commit. Authenticate to the correct npm
account interactively; never paste a token into chat or a tracked file.

```sh
npm login
npm whoami
npm publish ./artifacts/overseer-cli-0.1.0.tgz --access public
```

After registry publication, verify `npx --yes overseer-cli@0.1.0 --version`
and launch it inside a freshly cloned demo. Publish the prepared GitHub release
and attach the tested tarball. Update README and Project.md with actual registry,
release, and CI results. Do not label registry startup as passed before this step.

## Acceptance status

Release acceptance, registry publication, and the exact remote CI results are
recorded in Project.md. A prepared tarball is not a published npm release. Provider
tests use controlled responses; no live paid API-provider test is claimed.

0.1.0 is published to npm and GitHub. All 53 tests and four CI environments passed;
an isolated install of the published registry package and a fresh-clone `npx`
dashboard launch passed. See the [release](https://github.com/gipotenuzsa/overseer/releases/tag/v0.1.0)
and [acceptance record](../Project.md#2026-10-24--release-acceptance-complete).
