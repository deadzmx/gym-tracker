// LLM adapters for MiniMax and 智谱 (Zhipu GLM).
// Both follow OpenAI-compatible chat completions API, so we use a thin wrapper.

import type { LlmProvider, RecommendInput, RecommendOutput, Exercise, Experience, Goal } from "../types";

const ENDPOINTS: Record<LlmProvider, { url: string; defaultModel: string }> = {
  minimax: {
    url: "https://api.minimax.chat/v1/text/chatcompletion_v2",
    defaultModel: "MiniMax-Text-01",
  },
  zhipu: {
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    defaultModel: "glm-4-flash",
  },
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatChoice {
  message: { role: string; content: string };
}

interface ChatResponse {
  choices: ChatChoice[];
}

const LLM_TIMEOUT_MS = 45_000; // Bumped from 12s — international + DNS can be slow

function buildPrompt(input: RecommendInput, exercisePool: Exercise[], prMap: Record<number, number> = {}): string {
  const goalMap: Record<Goal, string> = {
    muscle: "增肌(肌肥大)",
    fat_loss: "减脂(保持肌肉)",
    strength: "最大力量",
    balanced: "综合体能",
  };
  const expMap: Record<Experience, string> = {
    beginner: "初学者(< 6 个月系统训练)",
    intermediate: "中级(6 个月-3 年)",
    advanced: "高级(> 3 年)",
  };
  const equipStr = input.available_equipment.length > 0 ? input.available_equipment.join("/") : "不限";

  const exerciseList = exercisePool
    .map((e) => {
      const pr = prMap[e.id];
      return `  - id=${e.id} 名称="${e.name}" 分类=${e.category ?? "其他"} 器械=${e.equipment ?? "其他"}${pr ? ` 估算1RM=${pr}kg` : ""}`;
    })
    .join("\n");

  const prCount = Object.keys(prMap).length;

  return `你是一名专业健身教练,根据用户问卷和动作库生成周训练计划。

## 用户问卷
- 目标:${goalMap[input.goal]}
- 经验:${expMap[input.experience]}
- 每周训练天数:${input.days_per_week}
- 可用器械:${equipStr}
- 单次时长:${input.session_duration_min} 分钟
${input.focus_areas && input.focus_areas.length > 0 ? `- 重点部位:${input.focus_areas.join("/")}` : ""}
${input.notes ? `- 备注:${input.notes}` : ""}

## 可用动作库(必须从以下 id 中选,不要编造)
${exerciseList}

## 用户历史 PR(估算 1RM,共 ${prCount} 个动作有记录)
${prCount === 0 ? "(无历史记录,所有 target_weight 请填 null)" : ""}
${Object.keys(prMap).length > 0 ? Object.entries(prMap).map(([id, pr]) => `  - id=${id}: 1RM ≈ ${pr}kg`).join("\n") : ""}

## 输出要求
严格返回以下 JSON(用 \`\`\`json ... \`\`\` 包裹,不要任何额外文字):
\`\`\`json
{
  "name": "计划名称",
  "description": "一句话计划简介",
  "days": [
    {
      "name": "周一 - 主题",
      "day_of_week": 1,
      "exercises": [
        { "exercise_id": 1, "order_index": 0, "target_sets": 4, "target_reps": 8, "target_weight": 42, "rest_seconds": 90 }
      ]
    }
  ],
  "rationale": "200 字以内的生成理由,中文,说明为什么这样安排"
}
\`\`\`

## 规则
1. 每天 3-6 个动作
2. 每天 2-3 个不同分类(胸/背/腿/肩/臂/核心)
3. day_of_week 用 0=周日 1=周一 ... 6=周六,按用户训练天数均匀分布(避开周日)
4. 增肌:4×8-12 rest 90s;力量:4-5×3-6 rest 120-180s;减脂:3-4×12-15 rest 45-60s;综合:3-4×8-12 rest 60-90s
5. exercise_id 必须从上面动作库的 id 中选取,选错会导致系统错误
6. 重点部位:每个部位每周至少 10 组
7. target_weight 必须填具体数字(kg),基于动作的 1RM 估算:
   - 增肌:1RM × 65-75%
   - 力量:1RM × 80-90%
   - 减脂:1RM × 60-70%
   - 综合:1RM × 70-78%
   四舍五入到最近的 2.5kg(标准杠铃片),最低 5kg
   如果某个动作没有 PR 记录,target_weight 填 null`;
}

function extractJson(text: string): unknown | null {
  // Strip ```json ... ``` fences if present, then try JSON.parse
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  const raw = fence ? fence[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

function validateLlmJson(
  obj: unknown,
  exercisePool: Exercise[],
  provider: LlmProvider,
): RecommendOutput | null {
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.name !== "string" || typeof o.description !== "string" || typeof o.rationale !== "string") {
    return null;
  }
  if (!Array.isArray(o.days) || o.days.length === 0) return null;
  const validIds = new Set(exercisePool.map((e) => e.id));
  for (const d of o.days) {
    if (typeof d !== "object" || d === null) return null;
    const day = d as Record<string, unknown>;
    if (typeof day.name !== "string") return null;
    if (typeof day.day_of_week !== "number") return null;
    if (!Array.isArray(day.exercises) || day.exercises.length === 0) return null;
    for (const ex of day.exercises) {
      if (typeof ex !== "object" || ex === null) return null;
      const e = ex as Record<string, unknown>;
      if (typeof e.exercise_id !== "number" || !validIds.has(e.exercise_id)) return null;
      if (typeof e.target_sets !== "number" || typeof e.target_reps !== "number") return null;
      if (typeof e.rest_seconds !== "number") return null;
    }
  }
  // Coerce — the loop above proved these are the right shapes, but TS
  // can't narrow the `unknown` array contents across the loop boundary.
  // Safe: every field below was just typeof-checked above.
  return {
    name: o.name,
    description: o.description,
    days: (o.days as Array<{ name: string; day_of_week: number; exercises: Array<{ exercise_id: number; order_index?: number; target_sets: number; target_reps: number; rest_seconds: number }> }>).map((d) => ({
      name: d.name,
      day_of_week: d.day_of_week,
      exercises: d.exercises.map((e, i) => ({
        exercise_id: e.exercise_id,
        order_index: typeof e.order_index === "number" ? e.order_index : i,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: null,
        rest_seconds: e.rest_seconds,
      })),
    })),
    rationale: o.rationale,
    source: "llm" as const,
    provider,
  };
}

export async function callLlm(
  provider: LlmProvider,
  apiKey: string,
  input: RecommendInput,
  exercisePool: Exercise[],
  prMap: Record<number, number> = {},
): Promise<RecommendOutput> {
  const cfg = ENDPOINTS[provider];
  if (!cfg) {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }
  const prompt = buildPrompt(input, exercisePool, prMap);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "你是专业健身教练,只输出符合要求的 JSON,不要解释。",
    },
    { role: "user", content: prompt },
  ];

  const body = {
    model: cfg.defaultModel,
    messages,
    temperature: 0.4,
    max_tokens: 2000,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const e = err as Error & { name?: string };
    // Distinguish timeout from network failure from other errors
    if (e.name === "AbortError") {
      throw new Error(
        `LLM request timed out after ${LLM_TIMEOUT_MS / 1000}s — 智普服务器响应太慢,可能是网络问题`,
      );
    }
    throw new Error(`LLM 网络请求失败: ${e.message}`);
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const text = await res.text();
    // Common cases
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `API key 无效或过期(HTTP ${res.status}):请检查 /settings 里填的智普 key`,
      );
    }
    if (res.status === 429) {
      throw new Error(`API 调用频率超限(HTTP 429):稍后再试`);
    }
    if (res.status >= 500) {
      throw new Error(
        `智普服务器错误(HTTP ${res.status}):${text.slice(0, 200)}`,
      );
    }
    throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM returned no content");
  }

  const parsed = extractJson(content);
  if (!parsed) {
    throw new Error("LLM returned invalid JSON");
  }
  const validated = validateLlmJson(parsed, exercisePool, provider);
  if (!validated) {
    throw new Error("LLM JSON failed schema validation");
  }
  return validated;
}

export async function testLlmConnection(
  provider: LlmProvider,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  const cfg = ENDPOINTS[provider];
  if (!cfg) {
    return { ok: false, message: `未知 provider: ${provider}` };
  }
  if (!apiKey || apiKey.length < 8) {
    return { ok: false, message: "API key 格式不对" };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.defaultModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 4,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, message: `HTTP ${res.status}: ${t.slice(0, 120)}` };
    }
    return { ok: true, message: "连接成功" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  } finally {
    clearTimeout(timeoutId);
  }
}
