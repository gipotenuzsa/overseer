# Using Overseer

Overseer 0.1 supports Next.js App Router and Supabase. Run it from the application
folder (the folder with its `package.json`, not a monorepo's parent folder).
Node 22.13+ on 22.x, 24.x, or 26+ is required. Git enables commit comparisons.
Analyzed projects do not need to be installed or running.

## Commands

```sh
npx overseer-cli                  # Open the local dashboard
npx overseer-cli ui ./my-app      # Choose an application folder
npx overseer-cli --no-open --port 4318
npx overseer-cli scan --json      # Save a snapshot and print the model
npx overseer-cli check            # Exit 1 when critical findings exist
npx overseer-cli diff             # Compare with the latest saved snapshot
npx overseer-cli diff --since HEAD
npx overseer-cli sync --dry-run
npx overseer-cli sync
```

The npm package is `overseer-cli`; its executable is `overseer`. The unrelated
`overseer` npm package is not this tool. You can also install a release tarball
with `npm install -g ./overseer-cli-0.1.0.tgz`, then use `overseer`.

The dashboard binds to `127.0.0.1`. If the requested port is busy, Overseer prints a
free port. Press Ctrl+C to stop. It never runs your application code.

`scan`, `check`, and each dashboard scan save a snapshot. Run a scan **before** an
agent session, then `diff` **before another scan** to keep the right baseline.
Alternatively, use `diff --since <commit-or-tag>` for a stable baseline. Git-ref
comparison reads committed blobs without checking out files or changing the index.
The first diff has no baseline and labels everything as added. HTML reports are
saved in `.overseer/reports/`; open the printed path in a browser.

`check` returns 0 without critical findings, 1 with critical findings, and 2 for a
scan/configuration error. Commander returns 1 for invalid command syntax. Findings
can exist at a successful exit: warnings and info do not fail `check`.

## Local files and configuration

Overseer writes snapshots, HTML reports, and optional explanation files under
`.overseer/`. It reads these optional settings from `.overseer/config.json`:

```json
{
  "ignore": ["generated/**"],
  "disabledChecks": [],
  "suppressions": [{ "checkId": "huge-file", "file": "lib/catalog.ts" }],
  "hugeFileLines": 400,
  "authHelpers": ["requireUser"],
  "publicApiRoutes": ["/api/contact"],
  "ai": { "mode": "off", "language": "en" }
}
```

Paths use `/` and are relative to the project. Suppressions match an exact check
and file, with an optional exact `line`. Ignore patterns follow `.gitignore`
syntax. `authHelpers` names known calls that check the caller. Use it only after
reviewing the helper. `publicApiRoutes` contains routes deliberately open to visitors.

Add generated data to your project's `.gitignore`:

```gitignore
.overseer/snapshots/
.overseer/reports/
.overseer/explain-request.md
.overseer/explanations.json
```

Keep `config.json` and `rules.md` in Git when they should be shared with contributors.
An invalid snapshot stops comparisons with an actionable error. Move that file
out of `snapshots/` to recover; Overseer does not discard your history silently.

## Rules for agents

Write one rule per line in `.overseer/rules.md`. These forms have built-in checks:

```markdown
- Keys only on the server.
- RLS on all tables.
- Files must be no longer than 400 lines.
```

`Secrets stay on the server.` is also supported. Other rules are copied to the
agent but are not automatically enforced. Supported rules enable the relevant
checks even if disabled in config; the lowest file-length limit wins. Suppressions
still apply.

`sync` creates missing rules and inserts a managed block in `AGENTS.md` and
`CLAUDE.md`. It includes an instruction to run a diff after an agent session.
Existing text outside the block, including its line endings, is preserved.
Repeated sync does not duplicate content. Broken or duplicate markers, links,
and non-UTF-8 instruction files are rejected before either file is changed.

## Optional AI explanations

Checks and health are deterministic. AI may name features, explain existing
findings, and summarize a diff. All AI text is labeled. It cannot add a finding or
change health. Responses must pass a schema, a facts hash, and file-reference
validation. These checks do not prove that generated prose is true; review it.

### Agent mode

Set `{"ai":{"mode":"agent","language":"en"}}` in `.overseer/config.json`,
then run a scan. Ask your coding agent:

> Complete .overseer/explain-request.md and write .overseer/explanations.json.
> Use only the supplied facts. Do not edit application code.

Run the same scan again to load the response. No provider is contacted by Overseer.
Your agent's own data handling and subscription apply. To explain a diff, run
`diff --since <fixed-commit>` before and after the agent response so the baseline
stays the same. An intervening scan changes the default snapshot baseline.
Changed facts, changed language, missing files, or invalid JSON reject a stale response.

### API mode

Enable this only when you want to send project facts to the configured provider:

```json
{
  "ai": {
    "mode": "api",
    "language": "en",
    "endpoint": "https://api.openai.com/v1",
    "model": "YOUR_MODEL_ID",
    "keyEnv": "OPENAI_API_KEY"
  }
}
```

Set the key in your shell environment. Do not put it in the config or commit it.
Choose a model supporting Chat Completions JSON mode. The adapter sends
`response_format: {"type":"json_object"}` and validates the response itself.
For a compatible local server, use an endpoint such as
`http://127.0.0.1:11434/v1` and your installed model ID. Local providers can omit a key.
Model availability and provider charges depend on your account.

Only HTTPS or loopback HTTP is accepted. Redirects are rejected. Requests time out
after 15 seconds; prompts are limited to 200 KB and responses to 1 MB. Errors fall
back to local text and appear under analysis limits. There is no automatic retry.

Requests contain file paths, feature relationships, table and environment names,
dependency names, check messages, and optional changes. **No source excerpts or
environment values are sent**, even in API mode. Recognizable credentials are
redacted. API credentials are used only in the request header. API mode contacts
your provider on each scan, including dashboard rescans.

See the [official Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
for the compatible request format.

## What the results mean

Health is `max(0, 100 - 15 × critical - 5 × warning - info)`. It counts known
patterns, not your project's overall quality or safety. Diff risk is high for new
critical findings, medium for new warnings or changed/removed files, and low
otherwise. A new dependency adds an informational finding only during a diff;
that temporary finding is not saved into the next static health baseline.

The scanner handles local imports, local tsconfig aliases, route groups, shared
layouts, literal API URLs, and literal or unshadowed module-level string table
names. It reads ordered SQL migrations under `supabase/migrations` and reports
unknown RLS as unknown. It does not connect to your database.

Limits include inherited tsconfig aliases, dynamic import paths, computed API
URLs, dynamic SQL, remote database changes, and complex auth wrappers. A detected
auth call does not prove authorization is correct. Unused-file checks are skipped
when unresolved imports or parse errors make the import graph incomplete.
Ignored/build folders, binary files, and symlinks are excluded. Text files are
limited to 2 MB each, 50 MB total, and 30,000 discovered entries. Skips and limits
are shown rather than treated as a complete scan.
