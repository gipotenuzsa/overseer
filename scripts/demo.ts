import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'artifacts/overseer-demo');
await mkdir(path.dirname(destination), { recursive: true });
// Refuse to replace an existing checkout or the user's changes to a demo.
await mkdir(destination);
function git(args: string[]): void {
  execFileSync('git', args, { cwd: destination, stdio: 'pipe' });
}
async function copyFixture(name: string): Promise<void> {
  await cp(path.join(root, `fixtures/${name}-next-app`), destination, {
    recursive: true,
    filter: (file) => !file.split(path.sep).includes('.overseer'),
  });
  const ignore = await readFile(path.join(destination, '.gitignore'), 'utf8');
  await writeFile(
    path.join(destination, '.gitignore'),
    ignore +
      '\n.overseer/snapshots/\n.overseer/reports/\n.overseer/explain-request.md\n.overseer/explanations.json\n',
  );
}
await copyFixture('good');
git(['init', '-b', 'main']);
git(['add', '.']);
git(['commit', '-m', 'Add a clean baseline for the Overseer demo']);
git(['tag', 'clean-baseline']);
for (const entry of await readdir(destination)) {
  if (entry === '.git') continue;
  const target = path.resolve(destination, entry);
  if (path.dirname(target) !== path.resolve(destination)) throw new Error('Invalid demo path.');
  await rm(target, { recursive: true, force: true });
}
await copyFixture('bad');
await cp(path.join(root, 'LICENSE'), path.join(destination, 'LICENSE'));
await writeFile(
  path.join(destination, 'README.md'),
  `# Overseer demo

A deliberately flawed Next.js + Supabase source sample for [Overseer](https://github.com/gipotenuzsa/overseer).
It was generated with AI for analyzer demonstrations. All credential-shaped values
are synthetic. Do not deploy it or connect it to a real database.

## Try it

Run with the published Overseer package:

\`\`\`sh
git clone https://github.com/gipotenuzsa/overseer-demo.git
cd overseer-demo
npx overseer-cli
\`\`\`

You can also install the Overseer release tarball and run \`overseer\`, or
use \`pnpm cli ui <path-to-this-folder>\` from the Overseer source repository.
The sample itself does not need npm install or a running web server.

Open Results to follow its files and data. Review a critical finding and copy its
fix prompt. Compare the intentionally flawed commit with the clean baseline:

\`\`\`sh
overseer diff --since clean-baseline
overseer check
\`\`\`

The default scan has 4 critical, 4 warning, and 2 informational findings, with health
18. The diff also reports the new nanoid dependency. \`check\` intentionally exits 1.
[EXPECTED.md](EXPECTED.md) describes each trigger, including an optional synthetic
environment-file exercise. Never use real credentials. The baseline and current
sample are analysis fixtures, not production-ready application templates.

MIT licensed. See the main repository for docs, releases, and contribution details.
`,
);
git(['add', '.']);
git(['commit', '-m', 'Demonstrate problems an AI coding session can introduce']);
console.log(`Demo repository prepared at ${destination}`);
