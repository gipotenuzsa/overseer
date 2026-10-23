# Overseer — implementation route

Last updated: 2026-10-23 (Asia/Qyzylorda).

This is the working record for the whole project. Update it after every meaningful
change. The product requirements are preserved verbatim in [docs/SPEC.md](docs/SPEC.md).
The original supplied Markdown file remains in the root for traceability.

## Current position

**Active stage: 1 — foundation, implemented and verified locally.** Dependency
installation, CLI tests, lint, type checks, builds, and the browser preview pass.
The remote CI acceptance gate is still pending. The repository began with only the specification.

The first implementation is deliberately limited to the foundation, as required by
the specification's one-stage-at-a-time workflow. Scanning is not implemented yet.
All subsequent stages remain planned until their prerequisites and acceptance gates pass.

## Product goal and boundaries

Help a person who cannot read code understand a Next.js App Router + Supabase project
and what an AI agent changed. The initial release will provide a feature map, session
reports, 12 deterministic checks, architecture rules, and a transparent health score.

- The core works locally, without an account, backend service, or API key.
- AI may explain existing facts; it must not invent findings or silently send code.
- Start with Next.js App Router and Supabase. Other frameworks belong to later releases.
- Do not promise that a project is secure. Report detected patterns and analysis limits.
- No editor, automatic fixes, cloud accounts, rollback, or VS Code extension in this release.
- Product UI, CLI output, comments, and contributor docs use English. The supplied
  Russian specification is retained unchanged.

## Reading of the specification

The central contract is `ProjectModel`. File and Git readers supply analyzers; analyzers
populate the model; feature grouping and deterministic checks enrich it; CLI, reports,
and the web UI consume the result. Rules are synchronized to agents without replacing
their existing instructions. AI is an optional explanation layer after this path works.

Important details to resolve at the relevant stage:

1. The document calls the feature set both “v1” and “v0.1”. Treat it as the first
   release, provisionally `0.1.0`; do not silently expand its scope.
2. `new-dependency` is a diff-only check. A static bad fixture cannot trigger all 12
   checks in one scan: its expectation file must define a baseline comparison for this one.
3. An uncommitted `.env` is not necessarily a committed secret. Separate tracked-file
   evidence from missing ignore protection, avoid reading secrets into output, and test
   nested Git roots and projects without Git.
4. SQL migrations are ordered. Handle enable/disable statements and schema-qualified
   names; an unknown table's RLS state must not be presented as a verified fact.
5. Next.js implicit entry points, aliases, route groups, dynamic routes, re-exports,
   and shared layouts can invalidate naive unused-file or feature grouping rules.
6. Auth checks and client boundaries require conservative evidence. Tests must cover
   imported wrappers, transitive client imports, and clearly public endpoints.
7. Snapshots must be versioned and deterministic apart from metadata. Reports and AI
   requests must never contain raw secret values; HTML must escape project-controlled text.
8. The local UI must bind to loopback. Git-ref comparison must not change the user's
   checkout or discard uncommitted changes.
9. The web acceptance gate requires a real Next.js + Supabase project; no real app
   has been supplied in this workspace yet.

## Roadmap and acceptance gates

| Stage                    | Deliverable                                                                                              | Acceptance gate                                                                        | Status                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| 1. Foundation            | pnpm workspace; strict TypeScript; core, CLI, web; Vitest; ESLint; CI                                    | `pnpm test` and `pnpm build` pass in GitHub Actions; local quality checks pass         | Local checks passed; remote CI pending |
| 2. Fixtures              | Small clean and problematic Next.js + Supabase projects; explicit expected findings                      | Both fixtures are documented; every check has a reproducible trigger or diff baseline  | Planned                                |
| 3. Scanner and analyzers | Ignore-aware discovery, routes, API methods, SQL tables, env usage, imports, dependencies; `scan --json` | Correct model for both fixtures, asserted by tests                                     | Planned                                |
| 4. Features and checks   | Import-based feature grouping; 12 check modules; health score; readable CLI output                       | Bad fixture matches expectations; good fixture has no critical/warning findings        | Planned                                |
| 5. Snapshots and diff    | Snapshots; terminal and HTML reports; `diff --since`; `check`                                            | Fixture edits produce correct additions/removals, risk, health changes, and exit codes | Planned                                |
| 6. Web UI                | Default command opens local overview; feature detail; findings; history                                  | Useful and correct on a real Next.js + Supabase project, beyond fixtures               | Planned                                |
| 7. Rules and sync        | Natural-language rules; supported built-in constraints; managed blocks                                   | Repeated sync is idempotent; all text outside markers remains unchanged                | Planned                                |
| 8. AI and release        | `off`, `agent`, `api`; schema validation; demo; README media; npm/GitHub release                         | Published package starts with one command on a clean machine                           | Planned                                |

### Stage 1 — foundation

- [x] Preserve the source specification in `docs/SPEC.md`.
- [x] Add this route, contributor instructions, English README, and MIT license.
- [x] Create a local Git repository on `main`.
- [x] Define three private workspace packages to prevent accidental publication.
- [x] Add strict shared TypeScript options and the model's initial type contracts.
- [x] Add a CLI entry point with help, version, and explicit development status.
- [x] Add a local-only Vite + React shell with no pretend scan data.
- [x] Configure Vitest, ESLint, formatting, and cross-platform scripts.
- [x] Configure GitHub Actions for Windows/Linux and Node 22/24.
- [x] Install dependencies and include a reproducible lockfile.
- [x] Pass formatting, lint, type checks, tests, build, and a built CLI smoke test.
- [x] Verify the preview in a browser.
- [x] Create the local foundation checkpoint commit (`chore: initialize Overseer foundation`).
- [ ] Run the workflow on GitHub and record its URL and result.

### Stage 2 — fixtures

- Make fixtures small and explain each intentional problem. Use synthetic tokens only.
- Add normal pages, nested routes, components, API handlers, client/server modules,
  Supabase migration examples, aliases, imports, and environment examples.
- Provide a finding-to-file/line expectation table in `bad-next-app/EXPECTED.md`.
- Create temporary Git repositories in tests for tracked `.env` and Git history cases;
  never commit a real environment file or nest an actual Git repository inside a fixture.
- Define a before/after dependency manifest for the diff-only check.
- Keep fixtures out of the workspace dependency install and the product lint rules.

### Stage 3 — scanner and analyzers

- Build deterministic discovery with `.gitignore`, config ignores, normalized relative
  paths, binary/build exclusions, bounded file reads, and safe symlink handling.
- Parse TypeScript/TSX with Babel and collect imports, env names, client directives,
  page routes, API methods, and Supabase accesses.
- Resolve local imports and path aliases without executing project code.
- Read SQL migrations and package metadata, then assemble `ProjectModel`.
- Detect unsupported stacks and parse failures honestly; keep `--json` stdout valid JSON.
- Verify both fixtures and test Windows/POSIX path behavior.

### Stage 4 — features and checks

- Trace pages through imports, literal API requests, and table accesses with explicit
  uncertainty where relationships cannot be established.
- Implement one module and fixture tests per check; share check metadata and finding IDs.
- Apply configuration for disabled checks, suppressions, and file size thresholds.
- Compute health as `max(0, 100 - 15 * critical - 5 * warning - info)`.
- Each finding must explain the evidence, consequence, location, and a practical fix prompt.

| Check ID                 | Level    | Key acceptance concern                                              |
| ------------------------ | -------- | ------------------------------------------------------------------- |
| `secret-in-code`         | critical | Strong secret evidence; synthetic test values; redact findings      |
| `env-file-committed`     | critical | Git tracking/ignore evidence; exclude `.env.example`                |
| `service-role-on-client` | critical | Client boundaries and public variable exposure                      |
| `public-secret-env`      | critical | Secret naming/value patterns; avoid public anon-key false positives |
| `rls-disabled`           | critical | Migration order, table names, and enable/disable state              |
| `api-no-auth`            | warning  | Mutating handlers and configurable auth wrapper evidence            |
| `dangerous-html`         | warning  | Executable AST constructs; ignore comments and inert strings        |
| `cors-wildcard`          | warning  | Wildcard headers on mutating endpoints                              |
| `huge-file`              | warning  | Configurable threshold; stable line counting                        |
| `duplicate-code`         | info     | Blocks of at least 15 lines; exclude generated output               |
| `unused-file`            | info     | Next.js implicit entries and resolved import graph                  |
| `new-dependency`         | info     | Only during comparison against a prior manifest                     |

### Stage 5 — snapshots and diff

- Validate/version snapshots; use atomic writes and a stable comparison baseline.
- Compare feature/file changes, APIs, tables, env names, dependency names, and findings.
- Explain risk and health changes; include both new and resolved findings.
- Generate a standalone, escaped HTML report and predictable terminal/JSON output.
- Implement Git-ref reads without checkout mutation; give actionable invalid-ref errors.
- Verify first run, repeat scan, deletion, corrupted snapshot, non-Git project, and
  `check` exit status 1 on critical findings.

### Stage 6 — web UI

- Serve only on loopback, open the browser, handle port conflicts, and shut down cleanly.
- Show real project data: overview, feature map/detail, findings with copyable fix prompts,
  snapshot history, and health trend.
- Provide accessible keyboard navigation, mobile layouts, empty states, and error states.
- Verify privacy, model accuracy, and usability against a real target project.
- Do not use this repository alone as the Next.js acceptance fixture: it is a Vite tool.

### Stage 7 — rules and agent sync

- Parse only documented built-in rules; pass unsupported natural-language rules through.
- Preserve user text, line endings, and instructions outside managed markers.
- Handle missing, duplicated, or malformed markers without destructive replacement.
- Test repeated sync, custom line limits, both agent files, and unusual encodings.
- Include the instruction to run a diff at the end of an agent session.

### Stage 8 — AI and release

- Default to `off`. For `agent`, emit a facts-only request and validate the response file.
- For `api`, require explicit configuration; redact secrets; use timeouts and safe fallback.
- Validate JSON schemas and cited file subsets; label generated explanations in the UI.
- Choose the npm package name/scope, package the core and built web assets correctly,
  and verify the packed tarball in a clean environment before publication.
- Record demo media from working features, add screenshots and release notes, and
  prepare the separate demo repository and contributor issues.
- Publish only at the release stage with the appropriate account/destination decided.
- Later: explain mode, quizzes, rollback, additional stacks, and editor integrations.

## Decisions and dependency rationale

| Decision                                                                     | Reason                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Node 22.13+ on 22.x, 24.x, or 26+; local Node 22.22.2                        | Compatible runtime range for the selected toolchain                             |
| pnpm 11.24.0 pinned in `packageManager`                                      | Match the installed tool and make installs reproducible                         |
| TypeScript 6.0.3                                                             | Current TypeScript 7 is outside typescript-eslint 8.72.0's supported peer range |
| ESLint, `@eslint/js`, typescript-eslint                                      | Lint JS/TS, forbid explicit `any`, and guard core boundaries                    |
| Vitest 5.0.5 and Vite 8.3.5                                                  | Workspace tests and local web development/build                                 |
| React, React DOM, Vite React plugin, matching type packages                  | Minimal typed browser shell consistent with the planned stack                   |
| Commander 15.0.0                                                             | Standard help/version parsing and correct CLI failure exits                     |
| Prettier                                                                     | Consistent formatting on Windows and Linux                                      |
| `@types/node` on 22.x                                                        | Type against the oldest supported Node major                                    |
| `tsc` for core and CLI                                                       | Emit ESM and declarations without adding a separate bundler                     |
| Shared type contracts, no scan implementation in stage 1                     | Establish package boundaries without skipping fixture-first development         |
| No Tailwind, React Flow, Babel, SQL parser, or AI SDK yet                    | Add each dependency when its stage needs it; avoid unused tooling               |
| Private packages, provisional CLI name `overseer-cli`, executable `overseer` | Prevent accidental publication and retain the intended short command            |
| CI actions pinned to verified release commit SHAs                            | Reproducible workflow dependencies                                              |

Naming check on 2026-10-23: the npm registry reports `overseer@1.0.1` exists for an
unrelated Object.observe shim; `overseer-cli` returns 404. The GitHub API reports 404
for `gipotenuzsa/overseer` and `gipotenuzsa/overseer-ai`. These observations do not reserve
names or guarantee publication rights. No remote repository or npm package was created.

Sources checked for toolchain setup: [Vite requirements](https://vite.dev/guide/),
[Vitest requirements](https://main.vitest.dev/guide/), npm registry package metadata,
and GitHub release/tag metadata. Exact dependency versions live in manifests and the lockfile.

## Verification record

Local environment: Windows, Node 22.22.2, pnpm 11.24.0.

| Verification                             | Result                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm install`                           | Passed; 138 packages installed with strict peer dependency validation                                      |
| `pnpm install --frozen-lockfile`         | Passed; lockfile reproduced without changes                                                                |
| `pnpm format:check`                      | Passed                                                                                                     |
| `pnpm lint`                              | Passed; zero warnings                                                                                      |
| `pnpm typecheck`                         | Passed for all packages, tests, and tool configs                                                           |
| `pnpm test`                              | Passed; 5 CLI tests covering default help, explicit help, version, unsupported commands, and unknown flags |
| `pnpm build`                             | Passed; core/CLI ESM output and production web assets generated                                            |
| `pnpm cli --help` / `pnpm cli --version` | Passed against the compiled CLI; version `0.1.0-dev.0`                                                     |
| Production web preview                   | HTTP 200; React content rendered and visually inspected in the browser                                     |
| Server binding                           | Verified listener on `127.0.0.1:4173`, not a public network interface                                      |
| Specification preservation               | SHA-256 of `docs/SPEC.md` matches the supplied original                                                    |

The CLI tests run on source code; the separate built CLI smoke checks verify emitted
ESM imports and package-version loading. Core analyzer tests and browser interaction
tests will be added when those behaviors exist, rather than testing placeholder logic.

Remote GitHub Actions has not run: this is a new local repository without a remote.
The specification's remote CI acceptance gate therefore remains open.
Linux and Node 24 are configured in CI but have not been executed locally.

## Work log

### 2026-10-23 — initial implementation

- Read the entire supplied specification and confirmed the workspace contained no code.
- Chose stage 1 as the first bounded deliverable and wrote the full implementation route.
- Preserved the requirements, added contributor guidance, and initialized local Git.
- Created the package layout, core contracts, CLI entry point, web shell, and quality tools.
- Checked naming and selected mutually compatible, pinned dependency versions.
- Installed locked dependencies and passed local lint, types, 5 tests, and all builds.
- Verified the built CLI, original-spec checksum, rendered preview, and loopback listener.
- Saved the foundation as a local Git checkpoint; there was no push or publication.
- Remaining stage 1 gate: a successful GitHub Actions run after a remote is connected.

## Exact next task

### 2026-10-23 — foundation review and GitHub setup

- Reviewed the specification, package boundaries, CLI, build scripts, and CI workflow.
- Re-ran all local quality checks and the built CLI help/version commands successfully.
- Confirmed the preserved specification still matches its original SHA-256 hash.
- Fixed the core lint boundary: allowing network clients in `src/ai/` no longer allows
  UI imports there. Checked rejected UI imports and allowed/forbidden network imports.
- The user authorized a public `gipotenuzsa/overseer` repository and the initial CI run.
- No new dependencies were added. Remote CI has not passed yet.

## Immediate next action

The remaining stage 1 gate is a successful run of the configured GitHub workflow after
a remote is connected. Once the gate is satisfied,
implement stage 2 only: the two fixtures and their expected findings, including a
baseline for `new-dependency`. Do not start scanner/check implementation before that.
