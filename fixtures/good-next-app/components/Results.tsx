'use client';
import { useState } from 'react';
export function Results() {
  const [message, setMessage] = useState('Ready');
  async function save() {
    const response = await fetch('/api/results', { method: 'POST', body: JSON.stringify({ score: 10 }) });
    setMessage(response.ok ? 'Saved' : 'Sign in to save');
  }
  return <section><button onClick={save}>Save result</button><p>{message}</p></section>;
}
