export function redact(text: string): string {
  return text
    .replace(
      /(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)/g,
      '[redacted]',
    )
    .replace(/(https?:\/\/)[^\s/@]+(?::[^\s/@]*)?@/gi, '$1[redacted]@')
    .replace(/([?&](?:token|key|secret|password|access_token)=)[^&\s]+/gi, '$1[redacted]');
}
