# Clean fixture

Expected: no critical or warning findings, health 100. Pages: `/` and `/results`.
APIs: `POST /api/results` and public read-only `GET /api/status`.
The results table has RLS and owner policies. The mutating handler verifies the user.
All source files are reachable from Next.js entry points. The client only imports React.
Environment examples have empty values; actual environment files are ignored.

These examples exercise known-pattern checks. A clean scan is not a security guarantee.
