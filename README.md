# Overseer

**See what your AI coding agent actually built.**

[![CI](https://github.com/gipotenuzsa/overseer/actions/workflows/ci.yml/badge.svg)](https://github.com/gipotenuzsa/overseer/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/overseer-cli.svg)](https://www.npmjs.com/package/overseer-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node 22 or 24](https://img.shields.io/badge/node-22%20%7C%2024-41785e.svg)](docs/USAGE.md)

Understand your Next.js + Supabase project without reading every file. See its
features, follow their data, review known problems, and give your coding agent a
clear fix prompt. Everything works locally without an account or API key.

![Overseer: overview, feature map, and a copyable fix prompt](https://raw.githubusercontent.com/gipotenuzsa/overseer/main/docs/media/demo.gif)

## Try it

The package name is `overseer-cli`. The unrelated `overseer` npm package
is not this project. Run inside your Next.js app:

```sh
npx overseer-cli
```

Or run from this repository:

```sh
npm install --global pnpm@11.24.0
pnpm install --frozen-lockfile
pnpm build
pnpm cli ui ./fixtures/bad-next-app
```

Replace the fixture path with your application folder. Node 22.13+ on 22.x, 24.x,
or 26+ is required. Your app does not need to be installed or running. Overseer
opens a local browser tab; Ctrl+C stops the server.

To install a prepared release tarball, use
`npm install -g ./overseer-cli-0.1.0.tgz`, then run `overseer` from your app folder.
See [release preparation](docs/RELEASE.md) and [complete usage](docs/USAGE.md).

## Why

An AI agent can change dozens of files while you are thinking about one feature.
It is hard to tell what changed, where your data goes, and what needs review.
Overseer turns those files into a feature map and a short list of questions you
can hand back to your agent.

## What you see

![Project overview with real scan results](https://raw.githubusercontent.com/gipotenuzsa/overseer/main/docs/media/overview.png)

- **Overview:** features, health, findings, and local history.
- **Feature details:** connected files, APIs, tables, and read/write relationships.
- **Findings:** evidence, why it matters, and a prompt you can copy to your agent.
- **Session reports:** added, changed, and removed parts, risk, and health changes.
- **Rules:** plain-language instructions shared with `AGENTS.md` and `CLAUDE.md`.

| Feature detail                                                                                        | Session report                                                                                         |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| ![Feature detail](https://raw.githubusercontent.com/gipotenuzsa/overseer/main/docs/media/feature.png) | ![HTML diff report](https://raw.githubusercontent.com/gipotenuzsa/overseer/main/docs/media/report.png) |

Screenshots use deliberately flawed source fixtures and synthetic credentials.
They do not contain code or findings from a private application.

## A session with your agent

```sh
overseer scan                   # Save the starting point
# Ask your agent to change the application
overseer diff                   # Compare before scanning again
overseer diff --since HEAD      # Or compare against a Git commit
overseer check                  # Exit 1 when critical findings exist
overseer sync --dry-run         # Preview the managed instruction blocks
overseer sync
```

You can use `npx overseer-cli` in place of `overseer`.
`scan --json`, `check --json`, and `diff --json` support automation. Diff saves a
standalone HTML report. Scans and history stay in `.overseer/`; add generated
files to `.gitignore` as described in [the guide](docs/USAGE.md).

## Checks

| Check                    | Level    | What it looks for                                          |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `secret-in-code`         | Critical | Strong credential patterns in source                       |
| `env-file-committed`     | Critical | Tracked env files or missing ignore protection             |
| `service-role-on-client` | Critical | Privileged Supabase keys reachable from client code        |
| `public-secret-env`      | Critical | Secret-named values exposed through public env names       |
| `rls-disabled`           | Critical | A created table without enabled row-level security         |
| `api-no-auth`            | Warning  | Direct write handlers without a recognized auth call       |
| `dangerous-html`         | Warning  | Raw HTML insertion and dynamic code evaluation             |
| `cors-wildcard`          | Warning  | Wildcard origins on a write endpoint                       |
| `huge-file`              | Warning  | Files above the configured line limit                      |
| `duplicate-code`         | Info     | Repeated blocks spanning at least 15 lines                 |
| `unused-file`            | Info     | Files with no detected consumer or implicit framework role |
| `new-dependency`         | Info     | Packages added since a comparison baseline                 |

Health is `max(0, 100 − 15 × critical − 5 × warning − info)`. It is a transparent
count of known patterns, **not a security guarantee**. Supabase RLS is inferred
from local migrations, not a live database. Analysis limits appear in the UI and
JSON. Prefer a missed finding to an unsupported accusation; see
[supported patterns and limits](docs/USAGE.md#what-the-results-mean).

## Privacy: runs locally by default

No telemetry, account, external fonts, or hosted backend. Overseer does not execute
application code or read `.env` contents. Installation needs internet access;
ordinary scans do not make network requests.

AI is optional and only explains detected facts:

- `off` is the default.
- `agent` writes a facts-only request for your existing coding agent. Overseer makes
  no provider request; your agent's own data handling applies.
- `api` explicitly sends selected project facts to your configured compatible
  provider. It sends no source excerpts or environment values.

Responses must pass schema, facts-hash, and file-reference validation. Invalid
responses fall back to deterministic text. Generated text is labeled and cannot
add findings or change health. Read [AI setup](docs/USAGE.md#optional-ai-explanations).

## Contributing and roadmap

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and the
[original specification](docs/SPEC.md). `pnpm check` runs formatting, lint, strict
type checks, tests, and builds. CI also installs and starts the packed release on
Windows and Linux with Node 22 and 24.

The first release covers Next.js App Router + Supabase, maps, checks, diffs, rules,
and optional explanations. Future work includes richer static SQL analysis,
inherited tsconfig aliases, more documented check patterns, and additional stacks.
Rollback, an editor, automatic fixes, cloud accounts, and editor extensions are
outside 0.1. See [Project.md](Project.md) for actual acceptance results and the
[good first issue list](https://github.com/gipotenuzsa/overseer/labels/good%20first%20issue).

## License

[MIT](LICENSE) © 2026 Overseer contributors.
