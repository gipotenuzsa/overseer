export interface SqlTable {
  name: string;
  rls: boolean;
  file: string;
  line: number;
}

export function analyzeSql(sources: Map<string, string>): SqlTable[] {
  const tables = new Map<string, SqlTable>();
  const identifier =
    '(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\\s*\\.\\s*(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?';
  const statements = new RegExp(
    `\\b(create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?|alter\\s+table\\s+(?:only\\s+)?|drop\\s+table\\s+(?:if\\s+exists\\s+)?)(` +
      identifier +
      ')([^;]*);',
    'gi',
  );
  // Match only migration files. Strip comments and quoted bodies without changing line numbers.
  for (const [file, text] of [...sources].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (!/(?:^|\/)supabase\/migrations\/[^/]+\.sql$/.test(file)) continue;
    const clean = text.replace(
      /--[^\n]*|\/\*[\s\S]*?\*\/|\$([\w]*)\$[\s\S]*?\$\1\$|'(?:''|[^'])*'/g,
      (value) => value.replace(/[^\n]/g, ' '),
    );
    for (const match of clean.matchAll(statements)) {
      const action = match[1]!.toLowerCase();
      const raw = match[2]!.replace(/\s/g, '');
      const tableName = raw
        .split('.')
        .map((part) => (part.startsWith('"') ? part.slice(1, -1) : part.toLowerCase()))
        .join('.')
        .replace(/^public\./, '');
      const tail = match[3]!.toLowerCase();
      if (action.startsWith('create')) {
        if (!tables.has(tableName))
          tables.set(tableName, {
            name: tableName,
            rls: false,
            file,
            line: clean.slice(0, match.index).split('\n').length,
          });
      } else if (action.startsWith('drop')) tables.delete(tableName);
      else {
        const table = tables.get(tableName);
        if (table && /\b(enable|disable)\s+row\s+level\s+security/.test(tail))
          table.rls = /\benable\s+row\s+level\s+security/.test(tail);
      }
    }
  }
  return [...tables.values()];
}
