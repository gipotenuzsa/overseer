# Overseer contributor instructions

Project: Overseer is a local CLI and web UI that explains Next.js + Supabase projects
to people who cannot read code. Read `docs/SPEC.md` and `Project.md` before any task.

## Rules

- Use strict TypeScript throughout. Do not use explicit `any`.
- Keep `packages/core` free of UI code. Network calls belong only in `src/ai/`.
- Never send user code anywhere unless the user explicitly enables `ai.mode: "api"`.
- Each check belongs in its own file in `packages/core/src/checks/`, with tests
  against both the bad and good fixtures. Prefer missing a problem over a false positive.
- Use simple English for product UI, CLI messages, code comments, and contributor docs.
  Preserve the supplied specification verbatim; conversation may use the user's language.
- Explain each new dependency in the PR description, or in `Project.md` if there is no PR.
- Implement one stage from the specification at a time. Do not skip an acceptance gate.
- Update `Project.md` after meaningful work: status, decisions, verification, limitations,
  and the exact next task. Never mark an unrun remote check as passed.
- Run `pnpm test` and `pnpm build` before finishing. Also run `pnpm lint`,
  `pnpm typecheck`, and `pnpm format:check` when source or tooling changes.
- Finish with what changed, how it was verified, and what remains.

## Current workspace

- `docs/SPEC.md`: the original product requirements.
- `Project.md`: the implementation route and running work log.
- `packages/core`: shared contracts, followed by deterministic analysis.
- `packages/cli`: terminal commands and, later, the local HTTP server.
- `packages/web`: browser UI; it reads the model and never performs analysis.
- Fixtures, checks, and the full product UI belong to their later stages.
