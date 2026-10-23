# Analyzer fixtures

These small Next.js App Router + Supabase source projects are test inputs, not deployed apps.
They are excluded from the pnpm workspace and product lint/format rules. No fixture dependencies
are installed by the repository's normal install. Every token is synthetic.

- `good-next-app`: authenticated writes, RLS, safe client code, protected environment files.
- `bad-next-app`: intentional problems listed in [EXPECTED.md](bad-next-app/EXPECTED.md).

Both include route groups, aliases, client/server modules, local API requests, and SQL migrations.
The route group `(workspace)` must not appear in the public `/results` route.
Run scans against copies in temporary directories. Tests create their own Git repositories;
there are no nested repositories or tracked environment files here.
