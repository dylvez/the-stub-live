const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export const isClaudeConfigured = Boolean(ANTHROPIC_API_KEY);

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Call Claude Messages API directly from the browser.
 *  Uses the `anthropic-dangerous-direct-browser-access` header for prototyping.
 *  Production should use a Firebase Cloud Function proxy.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Claude API error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const textBlock = data.content?.find(
      (block: { type: string; text?: string }) => block.type === 'text',
    );
    return textBlock?.text ?? '';
  } finally {
    clearTimeout(timeout);
  }
}
