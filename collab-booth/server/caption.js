// AI caption via the Anthropic Messages API, with a hard 6s budget.
import Anthropic from '@anthropic-ai/sdk';
import { sanitizeAiCaption } from '../shared/caption.js';

const MODEL = process.env.CAPTION_MODEL || 'claude-haiku-5-5';
const TIMEOUT_MS = 6000;
const RECENT_MAX = 10;

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 0 }) : null;

// Last N AI captions (raw, with {handle}) so the model can avoid repeating itself.
const recent = [];
// Last photo sent for captioning, for the admin "Test" button.
let lastPhoto = null;

export function setLastPhoto(base64) {
  lastPhoto = base64;
}

export function getLastPhoto() {
  return lastPhoto;
}

export function recentCaptions() {
  return [...recent];
}

function remember(caption) {
  recent.push(caption);
  while (recent.length > RECENT_MAX) recent.shift();
}

/**
 * Returns { caption, source: 'ai' } or { caption: '', source: 'fallback', reason }.
 * Never throws: any error or timeout falls back silently.
 */
export async function generateCaption({ imageBase64, stylePrompt, record = true }) {
  if (record) lastPhoto = imageBase64;
  if (!client) return { caption: '', source: 'fallback', reason: 'no_api_key' };

  const recentList = recent.length
    ? `Recent captions — do not repeat their openings or phrasing:\n${recent.map((c) => `- ${c}`).join('\n')}\n\n`
    : '';

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: stylePrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: `${recentList}Write the caption for this photo.` },
            ],
          },
        ],
      },
      { timeout: TIMEOUT_MS, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );

    if (response.stop_reason === 'refusal') {
      return { caption: '', source: 'fallback', reason: 'refusal' };
    }
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ');
    const caption = sanitizeAiCaption(text);
    if (!caption) return { caption: '', source: 'fallback', reason: 'empty' };
    if (record) remember(caption);
    return { caption, source: 'ai' };
  } catch (err) {
    const reason =
      err?.name === 'AbortError' || err instanceof Anthropic.APIConnectionTimeoutError
        ? 'timeout'
        : err instanceof Anthropic.APIError
          ? `api_${err.status ?? 'error'}`
          : 'error';
    console.warn(`[caption] fallback (${reason}):`, err?.message);
    return { caption: '', source: 'fallback', reason };
  }
}
