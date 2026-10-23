export interface ParsedRules {
  enforcedChecks: string[];
  maxLines?: number;
  supported: string[];
  forwarded: string[];
}
export const defaultRules =
  '# Project rules\n\n- Keys only on the server.\n- RLS on all tables.\n- Files must be no longer than 400 lines.\n';
export function parseRules(text: string): ParsedRules {
  const result: ParsedRules = { enforcedChecks: [], supported: [], forwarded: [] };
  for (const raw of text.split(/\r?\n/)) {
    const rule = raw.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)?/, '').trim();
    if (!rule || rule.startsWith('#')) continue;
    if (
      /^(?:keys only on the server|secrets stay on the server|ключи только на сервере)[.!]?$/i.test(
        rule,
      )
    ) {
      result.enforcedChecks.push('secret-in-code', 'service-role-on-client', 'public-secret-env');
      result.supported.push(rule);
      continue;
    }
    if (/^(?:rls on all tables|enable rls on all tables|rls на всех таблицах)[.!]?$/i.test(rule)) {
      result.enforcedChecks.push('rls-disabled');
      result.supported.push(rule);
      continue;
    }
    const limit =
      /^(?:files must be no longer than|file no longer than|файл не длиннее)\s+(\d+)\s+(?:lines|строк)[.!]?$/i.exec(
        rule,
      );
    if (limit && Number(limit[1]) >= 20 && Number(limit[1]) <= 100000) {
      result.maxLines = Math.min(result.maxLines ?? Infinity, Number(limit[1]));
      result.enforcedChecks.push('huge-file');
      result.supported.push(rule);
      continue;
    }
    result.forwarded.push(rule);
  }
  result.enforcedChecks = [...new Set(result.enforcedChecks)];
  return result;
}
