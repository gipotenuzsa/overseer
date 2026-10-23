import { createHash } from 'node:crypto';
import type { Finding, FindingLevel, ProjectModel } from '../model.js';
import type { ScanContext } from '../scanner/scan.js';

export interface Check {
  id: string;
  level: FindingLevel;
  title: string;
  whyDangerous: string;
  fixPrompt: string;
  run(context: ScanContext, baseline?: ProjectModel): Finding[] | Promise<Finding[]>;
}
export const mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export function finding(check: Check, file: string, line: number, message: string): Finding {
  return {
    id: createHash('sha256')
      .update(`${check.id}:${file}:${line}:${message}`)
      .digest('hex')
      .slice(0, 20),
    checkId: check.id,
    level: check.level,
    title: check.title,
    whyDangerous: check.whyDangerous,
    fixPrompt: check.fixPrompt,
    file,
    line,
    message,
  };
}
export function looksSecret(value: string, variable = ''): boolean {
  if (
    /^(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,})$/.test(
      value,
    )
  )
    return true;
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) {
    try {
      const body: unknown = JSON.parse(Buffer.from(value.split('.')[1]!, 'base64url').toString());
      if (body && typeof body === 'object' && 'role' in body && body.role === 'service_role')
        return true;
    } catch {
      return false;
    }
  }
  return (
    /(?:secret|token|api_?key|private_?key)/i.test(variable) &&
    value.length >= 32 &&
    /^[A-Za-z0-9+/=_-]+$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    new Set(value).size >= 20
  );
}
export function implicitEntry(file: string): boolean {
  return (
    /(?:^|\/)(?:page|route|layout|template|loading|error|global-error|not-found|global-not-found|default|head|sitemap|robots|manifest|opengraph-image|twitter-image|icon|apple-icon)\.[cm]?[jt]sx?$/.test(
      file,
    ) ||
    /(?:^|\/)(?:middleware|proxy|instrumentation|instrumentation-client|next-env)\.[cm]?[jt]sx?$/.test(
      file,
    ) ||
    /(?:^|\/)[^/]*config\.[cm]?[jt]s$|\.d\.ts$|\.(?:test|spec)\.[jt]sx?$/.test(file) ||
    /^(?:scripts|test|tests|e2e|supabase\/functions)\//.test(file)
  );
}
export function dependencyPurpose(name: string): string {
  const purposes: Record<string, string> = {
    nanoid: 'Usually creates short unique IDs.',
    zod: 'Usually validates input data.',
    stripe: 'Usually connects to payment services.',
    '@supabase/supabase-js': 'Usually connects to Supabase.',
    'lucide-react': 'Usually supplies interface icons.',
  };
  return purposes[name] ?? 'Its purpose cannot be confirmed from the package name alone.';
}
