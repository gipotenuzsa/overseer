# Contributing to Overseer

Read `AGENTS.md`, `docs/SPEC.md`, and `Project.md` first. Keep the supplied
specification unchanged. Discuss a new check's evidence and false positives
before broadening it.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm release:pack
pnpm release:smoke
```

Use strict TypeScript and simple English. Put each check in its own file under
`packages/core/src/checks/`, and test both good and bad cases. Use synthetic tokens
only. Keep UI out of core and network access inside `core/src/ai/` behind explicit
API mode. Explain new dependencies and update Project.md with verification and
known limits.

Keep pull requests focused. Describe the user-visible problem, the change, tests,
and limits. Do not report an unrun remote check as passed. Release artifacts are
generated under ignored `artifacts/`; never publish the private workspace packages.

## Small contributions

- Add examples for a supported rule or a common auth helper in `docs/USAGE.md`.
- Add a good/bad regression fixture for an import or route pattern, without
  weakening conservative findings.
- Improve keyboard navigation or empty-state wording with a reproducible example.

Look for the `good first issue` label, or open a focused issue describing one of
these. Bug reports should include Node/OS versions, the command, expected behavior,
and a small synthetic reproduction. Never post API keys or private project code.
