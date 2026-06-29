import { chatCompletion } from "./openRouter.js";

const DEFAULT_REPHRASE_PROMPT = `Перефразируй описание дефекта строительного объекта. Сохрани смысл, технические детали и стиль отчёта МЖИ. Верни только исправленный текст без пояснений и кавычек.

Текст:
{{text}}`;

const DEFECTS_KEY = "Выявленные дефекты";
const CONCURRENCY = 3;

function buildPrompt(template, text) {
  const prompt = (template?.trim() || DEFAULT_REPHRASE_PROMPT).replace(/\{\{text\}\}/g, text);
  return prompt;
}

function collectDefectNodes(node, bucket) {
  if (!node || typeof node !== "object") return;
  if (typeof node[DEFECTS_KEY] === "string" && node[DEFECTS_KEY].trim()) {
    bucket.push(node);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectDefectNodes(value, bucket);
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export async function rephraseDefectsBlock(results, { model, rephraseDefectPrompt, onProgress }) {
  const output = structuredClone(results);
  const nodes = [];
  collectDefectNodes(output, nodes);

  if (nodes.length === 0) {
    return output;
  }

  let completed = 0;
  const total = nodes.length;

  await mapWithConcurrency(nodes, CONCURRENCY, async (node) => {
    const original = node[DEFECTS_KEY];
    const rephrased = await chatCompletion(model, buildPrompt(rephraseDefectPrompt, original));
    node[DEFECTS_KEY] = rephrased;
    completed += 1;
    onProgress?.(completed, total);
  });

  return output;
}
