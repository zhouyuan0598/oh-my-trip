const REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

function enabledAiRoute() {
  return import.meta.env.VITE_ENABLE_LLM_ROUTE === "true";
}

export function isAiRouteEnabled() {
  return enabledAiRoute();
}

async function requestWithTimeout(url, options, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeAiRoutes(payload, totalDays) {
  if (!payload?.routes || !Array.isArray(payload.routes)) {
    return null;
  }
  const safeDays = Math.max(1, Number(totalDays) || 1);
  const routes = payload.routes.slice(0, 3).map((route, index) => {
    const days = Array.isArray(route.days) ? route.days : [];
    return {
      title: String(route.title || `路线方案 ${index + 1}`).trim(),
      summary: String(route.summary || "").trim(),
      recommendedTransport: String(route.recommendedTransport || "").trim(),
      fitReasons: Array.isArray(route.fitReasons) ? route.fitReasons.slice(0, 3).map((item) => String(item).trim()).filter(Boolean) : [],
      days: days
        .slice(0, safeDays)
        .map((day, dayIndex) => ({
          day: dayIndex + 1,
          title: String(day.title || `第 ${dayIndex + 1} 天`).trim(),
          summary: String(day.summary || "").trim(),
          spots: Array.isArray(day.spots) ? day.spots.slice(0, 6).map((item) => String(item).trim()).filter(Boolean) : [],
        }))
        .filter((item) => item.summary || item.title),
    };
  });
  return routes.length ? routes : null;
}

function parseJsonContent(content) {
  const raw = String(content || "").trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(fenced);
    } catch {
      return null;
    }
  }
}

export async function fetchAiRouteRecommendationsWithMeta(formInput) {
  if (!enabledAiRoute()) {
    return { used: false, routes: null, reason: "未开启" };
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return { used: false, routes: null, reason: "缺少 API Key" };
  }

  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL;

  const prompt = `
你是资深旅行路线设计师。请基于用户输入给出 3 个可执行的游玩路线方案。
必须输出 JSON 对象，结构如下：
{
  "routes": [
    {
      "title": "方案标题",
      "summary": "一句话概述",
      "recommendedTransport": "self-drive/high-speed-rail/flight",
      "fitReasons": ["原因1","原因2","原因3"],
      "days": [
        {"day":1,"title":"当天主线","summary":"当天推荐路线与重点","spots":["景点A","景点B","景点C"]}
      ]
    }
  ]
}
要求：
1. routes 必须是 3 条；
2. 每条 days 条数必须与用户 days 一致；
3. 文案必须是中文；
4. 不输出任何 markdown。
5. 每一天 spots 至少给 3 个真实景点名，优先使用用户目的地内高相关景点。
6. recommendedTransport 只能是 self-drive / high-speed-rail / flight 之一。
用户输入：
${JSON.stringify(formInput)}
  `.trim();

  try {
    const response = await requestWithTimeout(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你只返回 JSON，不返回解释。" },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return { used: false, routes: null, reason: `HTTP ${response.status}` };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      return { used: false, routes: null, reason: "返回内容为空" };
    }
    const parsed = parseJsonContent(content);
    if (!parsed) {
      return { used: false, routes: null, reason: "返回不是可解析 JSON" };
    }
    const routes = sanitizeAiRoutes(parsed, formInput.days);
    if (!routes) {
      return { used: false, routes: null, reason: "返回结构不符合要求" };
    }
    return { used: true, routes, reason: "ok" };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { used: false, routes: null, reason: `超时（>${REQUEST_TIMEOUT_MS / 1000}s）` };
    }
    return { used: false, routes: null, reason: `请求异常：${error?.message || "未知错误"}` };
  }
}

export async function fetchAiRouteRecommendations(formInput) {
  const result = await fetchAiRouteRecommendationsWithMeta(formInput);
  return result.routes;
}
