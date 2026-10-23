# Intentional findings

This project is a source fixture with synthetic tokens only. Do not deploy it.

| Check | Level | File | Line | Evidence |
| --- | --- | --- | --- | --- |
| secret-in-code | critical | lib/admin.ts | 4 | Synthetic Stripe secret-shaped literal |
| env-file-committed | critical | .env | 1 | Copy test-data/env.txt to .env and stage it in a temporary Git repository |
| service-role-on-client | critical | lib/admin.ts | 2 | A client component imports a module that reads the service role key |
| public-secret-env | critical | lib/admin.ts | 3 | NEXT_PUBLIC_PRIVATE_TOKEN exposes a secret name |
| rls-disabled | critical | supabase/migrations/001_results.sql | 1 | Created table has no enable RLS statement |
| api-no-auth | warning | app/api/results/route.ts | 2 | POST writes data without an auth call |
| dangerous-html | warning | components/Results.tsx | 10 | Raw HTML insertion |
| cors-wildcard | warning | app/api/results/route.ts | 6 | Wildcard origin on a mutating endpoint |
| huge-file | warning | lib/long.ts | 1 | 402 lines with the default limit of 400 |
| duplicate-code | info | lib/second.ts | 1 | A token block spans the repeated function body also in lib/first.ts |
| unused-file | info | lib/unused.ts | 1 | No incoming imports and no implicit Next.js role |
| new-dependency | info | package.json | 1 | nanoid added relative to baseline.package.json; diff only |

A static scan can trigger 11 check IDs. For the environment check, tests copy the fixture,
initialize Git, copy the synthetic environment template, and stage .env. A separate test
leaves .env untracked to check missing ignore protection. Never stage a real secret.
The twelfth check compares the current manifest to baseline.package.json.
No finding, snapshot, report, or AI request may contain the synthetic secret literal.
