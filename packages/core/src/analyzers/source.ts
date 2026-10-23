import { parse } from '@babel/parser';

type Ast = Record<string, unknown>;
export const record = (value: unknown): Ast | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Ast) : undefined;
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export function literal(value: unknown): string | undefined {
  const node = record(value);
  if (node?.type === 'StringLiteral' && typeof node.value === 'string') return node.value;
  return undefined;
}
export function name(value: unknown): string {
  const node = record(value);
  if (!node) return '';
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') return String(node.name);
  if (node.type === 'StringLiteral') return String(node.value);
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const property = node.computed ? literal(node.property) : name(node.property);
    return property ? `${name(node.object)}.${property}` : '';
  }
  return '';
}
export function lineOf(node: Ast): number {
  const line = record(record(node.loc)?.start)?.line;
  return typeof line === 'number' ? line : 1;
}
function walk(value: unknown, visit: (node: Ast, parent?: Ast) => void, parent?: Ast): void {
  if (Array.isArray(value)) {
    for (const child of value) walk(child, visit, parent);
    return;
  }
  const node = record(value);
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const [key, child] of Object.entries(node)) {
    if (
      ![
        'loc',
        'extra',
        'comments',
        'leadingComments',
        'trailingComments',
        'innerComments',
        'tokens',
      ].includes(key)
    )
      walk(child, visit, node);
  }
}

export interface SourceFacts {
  client: boolean;
  imports: string[];
  methods: { name: string; line: number }[];
  env: { name: string; line: number }[];
  tables: { name: string; access: 'read' | 'write' }[];
  requests: string[];
  calls: { name: string; line: number }[];
  strings: { value: string; name: string; line: number }[];
  dangerous: number[];
  cors: number[];
  wrapped: boolean;
}
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
export function analyzeSource(source: string): SourceFacts {
  const ast = parse(source, {
    sourceType: 'unambiguous',
    plugins: ['typescript', 'jsx'],
    attachComment: false,
  });
  const facts: SourceFacts = {
    client: false,
    imports: [],
    methods: [],
    env: [],
    tables: [],
    requests: [],
    calls: [],
    strings: [],
    dangerous: [],
    cors: [],
    wrapped: false,
  };
  walk(ast, (node, parent) => {
    const line = lineOf(node);
    if (node.type === 'Directive' && literal(node.value) === 'use client') facts.client = true;
    if (node.type === 'DirectiveLiteral' && node.value === 'use client') facts.client = true;
    if (
      [
        'ImportDeclaration',
        'ExportNamedDeclaration',
        'ExportAllDeclaration',
        'ImportExpression',
      ].includes(String(node.type))
    ) {
      const target = literal(node.source);
      if (target) facts.imports.push(target);
    }
    if (node.type === 'ExportNamedDeclaration') {
      const declaration = record(node.declaration);
      const exported = [
        name(declaration?.id),
        ...array(declaration?.declarations).map((item) => name(record(item)?.id)),
        ...array(node.specifiers).map((item) => name(record(item)?.exported)),
      ];
      for (const method of exported)
        if (methods.has(method)) facts.methods.push({ name: method, line });
      if (
        array(declaration?.declarations).some(
          (item) => record(record(item)?.init)?.type === 'CallExpression',
        )
      )
        facts.wrapped = true;
      if (array(node.specifiers).length) facts.wrapped = true;
    }
    const member = name(node);
    if (
      ['MemberExpression', 'OptionalMemberExpression'].includes(String(node.type)) &&
      member.startsWith('process.env.') &&
      member.split('.').length === 3
    )
      facts.env.push({ name: member.slice(12), line });
    if (node.type === 'VariableDeclarator' && name(node.init) === 'process.env') {
      for (const prop of array(record(node.id)?.properties)) {
        const key = name(record(prop)?.key);
        if (key) facts.env.push({ name: key, line });
      }
    }
    if (node.type === 'StringLiteral')
      facts.strings.push({
        value: String(node.value),
        name: name(parent?.id ?? parent?.key),
        line,
      });
    if (node.type === 'JSXAttribute' && name(node.name) === 'dangerouslySetInnerHTML')
      facts.dangerous.push(line);
    if (
      node.type === 'ObjectProperty' &&
      name(node.key).toLowerCase() === 'access-control-allow-origin' &&
      literal(node.value) === '*'
    )
      facts.cors.push(line);
    if (node.type !== 'CallExpression' && node.type !== 'NewExpression') return;
    const callee = name(node.callee);
    const args = array(node.arguments);
    facts.calls.push({ name: callee, line });
    if (callee === 'eval' || (callee === 'Function' && node.type === 'NewExpression'))
      facts.dangerous.push(line);
    if (callee === 'require' || record(node.callee)?.type === 'Import') {
      const target = literal(args[0]);
      if (target) facts.imports.push(target);
    }
    if (callee === 'fetch') {
      const target = literal(args[0]);
      if (target?.startsWith('/api/')) facts.requests.push(target.split('?')[0]!);
    }
    if (
      callee.endsWith('.set') &&
      literal(args[0])?.toLowerCase() === 'access-control-allow-origin' &&
      literal(args[1]) === '*'
    )
      facts.cors.push(line);
    if (callee.endsWith('.from') && literal(args[0]))
      facts.tables.push({ name: literal(args[0])!, access: 'read' });
    const property = name(record(node.callee)?.property);
    if (['insert', 'update', 'upsert', 'delete'].includes(property)) {
      let inner = record(record(node.callee)?.object);
      for (let count = 0; inner && count < 20; count++) {
        if (name(inner.callee).endsWith('.from')) {
          const table = literal(array(inner.arguments)[0]);
          if (table) facts.tables.push({ name: table, access: 'write' });
          break;
        }
        inner = record(record(inner.callee)?.object);
      }
    }
  });
  facts.imports = [...new Set(facts.imports)];
  facts.env = facts.env.filter(
    (item, i, list) =>
      list.findIndex((other) => other.name === item.name && other.line === item.line) === i,
  );
  return facts;
}
