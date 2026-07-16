export function normalizeDocumentContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  if (typeof record.html === 'string') return record.html;
  if (typeof record.body === 'string') return record.body;
  return '';
}
