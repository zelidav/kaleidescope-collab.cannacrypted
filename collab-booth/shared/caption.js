// Caption helpers shared by the server (final caption) and the kiosk (live preview).

export const HANDLE_RE = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{1,30}$/;

/** Strip @, spaces and URL junk; lowercase. Does not validate. */
export function cleanHandle(raw) {
  return String(raw || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function isValidHandle(handle) {
  return HANDLE_RE.test(handle);
}

/**
 * Put the guest's handle into the AI line: replace {handle} with @handle,
 * or prepend "@handle " when the model forgot the placeholder.
 */
export function fillHandle(aiCaption, handle) {
  const at = handle ? `@${handle}` : '';
  const text = String(aiCaption || '').trim();
  if (!at) return text.replace(/\s*\{handle\}\s*/g, ' ').trim();
  if (text.includes('{handle}')) return text.replaceAll('{handle}', at);
  return text ? `${at} ${text}` : at;
}

/** Final post caption = template with {ai_caption}, {handle}, {hashtags} filled. */
export function buildCaption({ template, aiCaption, handle, hashtags }) {
  const aiLine = fillHandle(aiCaption, handle);
  const out = String(template || '{ai_caption}')
    .replaceAll('{ai_caption}', aiLine)
    .replaceAll('{hashtags}', hashtags || '')
    .replaceAll('{handle}', handle ? `@${handle}` : '');
  // Tidy: no trailing spaces, max one blank line in a row, no leading/trailing blanks.
  return out
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Post-process raw model output into a safe single caption line. */
export function sanitizeAiCaption(raw) {
  let s = String(raw || '').trim();
  s = s.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
  s = s.replace(/^caption:\s*/i, '');
  s = s.replace(/^["“”']+|["“”']+$/g, '');
  s = s.replace(/\bbongs\b/gi, 'B*NGs').replace(/\bbong\b/gi, 'B*NG');
  s = s.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '').replace(/\s{2,}/g, ' ').trim();
  // Normalise {Handle}, { handle }, @{handle} variants to the literal placeholder.
  s = s.replace(/@?\{\s*handle\s*\}/gi, '{handle}');
  return s;
}
