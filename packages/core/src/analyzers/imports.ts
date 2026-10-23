import path from 'node:path';
import { parse } from 'jsonc-parser';
import { record } from './source.js';

export function importResolver(
  sources: Map<string, string>,
): (file: string, specifier: string) => string | undefined {
  const config: unknown = parse(
    sources.get('tsconfig.json') ?? sources.get('jsconfig.json') ?? '{}',
  );
  const compiler = record(record(config)?.compilerOptions);
  const base = typeof compiler?.baseUrl === 'string' ? compiler.baseUrl : '.';
  const paths = record(compiler?.paths) ?? {};
  const aliases = Object.entries(paths).filter(
    (entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].every((value) => typeof value === 'string'),
  );
  function resolve(candidate: string): string | undefined {
    candidate = path.posix.normalize(candidate);
    if (candidate.startsWith('../') || path.posix.isAbsolute(candidate)) return undefined;
    const candidates = [
      candidate,
      ...['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs', '.json'].map(
        (ext) => candidate + ext,
      ),
      ...['.ts', '.tsx', '.js', '.jsx'].map((ext) => `${candidate}/index${ext}`),
    ];
    if (/\.[cm]?jsx?$/.test(candidate))
      candidates.push(
        candidate.replace(/\.[cm]?jsx?$/, '.ts'),
        candidate.replace(/\.[cm]?jsx?$/, '.tsx'),
      );
    return candidates.find((file) => sources.has(file));
  }
  return (file, specifier) => {
    if (specifier.startsWith('.'))
      return resolve(path.posix.join(path.posix.dirname(file), specifier));
    for (const [pattern, targets] of aliases) {
      const [prefix = '', suffix = ''] = pattern.split('*');
      if (
        pattern.includes('*')
          ? !specifier.startsWith(prefix) || !specifier.endsWith(suffix)
          : pattern !== specifier
      )
        continue;
      const middle = pattern.includes('*')
        ? specifier.slice(prefix.length, suffix ? -suffix.length : undefined)
        : '';
      for (const target of targets) {
        const found = resolve(path.posix.join(base, target.replace('*', middle)));
        if (found) return found;
      }
    }
    return resolve(path.posix.join(base, specifier));
  };
}

export function routeFor(file: string): string | undefined {
  const match = /^(?:src\/)?app\/(.*\/)?(?:page|route)\.[cm]?[jt]sx?$/.exec(
    file.replaceAll('\\', '/'),
  );
  if (!match) return undefined;
  return (
    '/' +
    (match[1] ?? '')
      .split('/')
      .filter((part) => part && !/^\([^)]*\)$/.test(part) && !part.startsWith('@'))
      .join('/')
  );
}
