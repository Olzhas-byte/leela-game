/**
 * Клиент GLM 5.2 (Zhipu AI) через OpenAI-совместимый API.
 * Используется только на сервере (API-роуты) — ключ никогда не уходит в браузер.
 *
 * Требуемые env:
 *   GLM_API_KEY   — ключ Zhipu
 *   GLM_BASE_URL  — напр. https://open.bigmodel.cn/api/paas/v4  (подтвердить по докам)
 *   GLM_MODEL     — id модели, напр. glm-5.2
 */
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './systemPrompt';

function getClient(): OpenAI {
  const apiKey = process.env.GLM_API_KEY;
  const baseURL = process.env.GLM_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error('Не заданы GLM_API_KEY / GLM_BASE_URL в окружении.');
  }
  return new OpenAI({ apiKey, baseURL });
}

const MODEL = process.env.GLM_MODEL ?? 'glm-5.2';

export interface InterpretOptions {
  /** Текст контекста хода (из buildTurnContext). */
  userContext: string;
  /** Колбэк на каждый кусок текста (для стрима в UI). */
  onToken?: (chunk: string) => void;
  signal?: AbortSignal;
  temperature?: number;
}

/**
 * Запрашивает трактовку у GLM со стримингом. Возвращает полный собранный текст.
 * При ошибке/таймауте пробрасывает исключение — вызывающий код показывает
 * сухой результат хода из движка и кнопку «повторить трактовку».
 */
export async function interpretTurn(opts: InterpretOptions): Promise<string> {
  const client = getClient();
  const stream = await client.chat.completions.create(
    {
      model: MODEL,
      stream: true,
      temperature: opts.temperature ?? 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: opts.userContext },
      ],
    },
    { signal: opts.signal },
  );

  let full = '';
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content ?? '';
    if (token) {
      full += token;
      opts.onToken?.(token);
    }
  }
  return full.trim();
}

/** Нестриминговый фоллбэк (если стрим недоступен у провайдера). */
export async function interpretTurnOnce(userContext: string): Promise<string> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContext },
    ],
  });
  return (res.choices[0]?.message?.content ?? '').trim();
}
