# Overseer

**See what your AI coding agent actually built.**

Overseer is a local tool for understanding a Next.js + Supabase project without having
to read every file. It will map features, explain changes, highlight known risk patterns,
and pass your architecture rules to your coding agent.

**Development status: stage 1 of 8.** The workspace, CLI entry point, and web shell are
implemented. Scanning, security checks, reports, and AI explanations are not available
yet. This package has not been published to npm. Do not use `npx overseer`: that name
currently belongs to a different project.

## Run the development preview

Use Node.js 22.13+ on the 22.x line, 24.x, or 26+. The tested local version is in
`.node-version`. Install the pinned package manager if needed:

```sh
npm install --global pnpm@11.24.0
pnpm install --frozen-lockfile
pnpm check
pnpm cli --help
pnpm dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:5173`). The page is
a development shell; it does not scan a project. Stop the server with Ctrl+C.
Run `pnpm build` before `pnpm cli` if you have not run `pnpm check`.

## Why

An AI coding agent can change dozens of files in one session. It can be difficult to
tell which features changed, whether data is protected, and which questions to ask
before deploying. Overseer is being built to make those changes understandable.

## Privacy

**Overseer is designed to run entirely locally by default.** The current preview has no
telemetry, accounts, external fonts, or runtime API calls. Installing dependencies
requires internet access. Future AI explanations will be optional; direct API calls
will require an explicit setting. Known-pattern checks will not certify that a project
is secure.

## Workspace

| Package         | Responsibility                                                    |
| --------------- | ----------------------------------------------------------------- |
| `packages/core` | Shared model types; future scanning, checks, snapshots, and rules |
| `packages/cli`  | CLI help/version; future commands and local server                |
| `packages/web`  | React development shell; future map, findings, and history        |

## Contributing

Read [the implementation route](Project.md), [the original specification](docs/SPEC.md),
and [the contributor rules](AGENTS.md). Work on one stage at a time and update the route
with what you verified. `pnpm check` runs formatting, lint, type checks, tests, and builds.
GitHub Actions is configured to run these checks on Windows and Linux with Node 22 and 24.

The next stage adds clean and intentionally problematic Next.js + Supabase fixtures.
The complete eight-stage roadmap and release gates live in [Project.md](Project.md).

## License

[MIT](LICENSE) © 2026 Overseer contributors.
