import { getAiSettings } from "../../dataBase/appData.service.js";
import { rephraseDefectsBlock } from "../../services/rephraseDefects.js";

function writeNdjsonLine(res, payload) {
  res.write(`${JSON.stringify(payload)}\n`);
  if (typeof res.flush === "function") {
    res.flush();
  }
}

export async function RephraseDefectsBlock(req, res) {
  const results = req.body?.results;
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    return res.status(400).json({ success: false, error: "results object is required" });
  }

  try {
    const settings = await getAiSettings();
    const model = settings.model?.trim() || "deepseek/deepseek-v3.2";

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const data = await rephraseDefectsBlock(results, {
      model,
      rephraseDefectPrompt: settings.rephraseDefectPrompt,
      onProgress: (done, total) => writeNdjsonLine(res, { progress: done, total }),
    });

    writeNdjsonLine(res, { success: true, data });
    return res.end();
  } catch (err) {
    if (res.headersSent) {
      writeNdjsonLine(res, {
        success: false,
        error: err.message || "Rephrase failed",
      });
      return res.end();
    }

    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Rephrase failed",
    });
  }
}
