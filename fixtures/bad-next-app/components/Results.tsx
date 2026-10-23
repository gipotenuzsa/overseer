'use client';
import { adminKey } from '@/lib/admin';
import { calculateFirst } from '@/lib/first';
import { calculateSecond } from '@/lib/second';
import { longMessage } from '@/lib/long';
export function Results() {
  async function save() {
    await fetch('/api/results', { method: 'POST', body: JSON.stringify({ score: calculateFirst(2) + calculateSecond(3) }) });
  }
  return <section><button onClick={save}>Save</button><div dangerouslySetInnerHTML={{ __html: longMessage }} /><span>{adminKey}</span></section>;
}
