const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY as string | undefined;
const API_URL = 'https://api.perplexity.ai/chat/completions';
const MODEL = 'sonar-pro';

export const isClaudeConfigured = Boolean(PERPLEXITY_API_KEY);

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Call Perplexity AI API directly from the browser.
 *  Production should use a Firebase Cloud Function proxy.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('VITE_PERPLEXITY_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Perplexity API error ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timeout);
  }
}
