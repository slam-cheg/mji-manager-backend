const DEFAULT_BASE_URL = "https://routerai.ru/api/v1";

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

function getBaseUrl() {
  return (process.env.OPENROUTER_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function buildHeaders() {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("OPENROUTER_API_KEY не задан на сервере"), { status: 503 });
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (process.env.OPENROUTER_HTTP_REFERER?.trim()) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER.trim();
  }
  if (process.env.OPENROUTER_X_TITLE?.trim()) {
    headers["X-Title"] = process.env.OPENROUTER_X_TITLE.trim();
  }
  return headers;
}

export async function chatCompletion(model, userPrompt, options = {}) {
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS) || 300000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userPrompt }],
        temperature: options.temperature ?? 0.2,
      }),
    });

    const bodyText = await response.text();
    let payload;
    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      throw Object.assign(new Error("OpenRouter вернул невалидный JSON"), { status: 502 });
    }

    if (!response.ok) {
      const detail = payload?.error?.message || payload?.message || bodyText.slice(0, 200);
      throw Object.assign(new Error(detail || `OpenRouter HTTP ${response.status}`), {
        status: response.status >= 500 ? 503 : 502,
      });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw Object.assign(new Error("OpenRouter не вернул текст ответа"), { status: 502 });
    }
    return content.trim();
  } catch (err) {
    if (err.name === "AbortError") {
      throw Object.assign(new Error("OpenRouter timeout"), { status: 504 });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
