import { Capability } from "../domain/capabilities.js";
import { defineProvider } from "../domain/provider.js";
import { JobState, toGenerationResult, waitForJob } from "../domain/job.js";
import { buildModelInput } from "../domain/payload.js";
import { ProviderHttpError, providerRequest, providerUpload } from "../transport/client.js";
import { kieCatalog } from "./catalog.js";

// kie.ai adapter. Every catalogued model (image, video, lipsync, Suno,
// ElevenLabs) shares one lifecycle:
//   POST api/v1/jobs/createTask { model, input } → data.taskId
//   GET  api/v1/jobs/recordInfo?taskId=…        → data.state waiting|queuing|generating|success|fail
// Docs: https://docs.kie.ai (index at https://docs.kie.ai/llms.txt).

const PROVIDER_ID = "kie";
const USD_PER_CREDIT = 0.005;
const UPLOAD_FOLDER = "open-generative";

// kie answers HTTP 200 even on errors: the real status is the body's `code`.
function unwrap(body, label) {
  if (body?.code === 200) return body.data;
  const code = Number(body?.code) || 0;
  throw new ProviderHttpError(`${label} failed: ${code} - ${body?.msg || "unknown error"}`, {
    status: code,
    body,
    retryable: code >= 500 || code === 429,
  });
}

async function call(credential, path, { method = "GET", json } = {}) {
  const body = await providerRequest(PROVIDER_ID, { path, method, json, credential });
  return unwrap(body, `kie ${path.split("?")[0]}`);
}

// recordInfo returns the result both raw (resultJson, a JSON string) and
// parsed (response). Most models answer { resultUrls }; Suno answers its
// tracks (two per request); Veo at 1080p/4k nests the upscaled URLs.
function extractOutputUrls(task) {
  let result = task?.response;
  if (!result && task?.resultJson) {
    try {
      result = typeof task.resultJson === "string" ? JSON.parse(task.resultJson) : task.resultJson;
    } catch {
      result = null;
    }
  }
  if (!result) return [];
  const tracks = Array.isArray(result.data) ? result.data : result.sunoData;
  if (Array.isArray(tracks)) return tracks.map((track) => track.audio_url).filter(Boolean);
  if (result.data?.result_urls) return result.data.result_urls;
  return result.resultUrls || result.result_urls || (result.resultImageUrl ? [result.resultImageUrl] : []);
}

function toSnapshot(task) {
  if (task?.state === "success") return { state: JobState.SUCCEEDED, outputs: extractOutputUrls(task), raw: task };
  if (task?.state === "fail") {
    return { state: JobState.FAILED, error: task.failMsg || task.failCode || "Task failed", raw: task };
  }
  return { state: JobState.RUNNING, raw: task };
}

async function runModel(credential, model, params, { interval }) {
  if (!model) throw new Error(`Unknown kie model "${params._modelId || params.model}".`);

  const data = await call(credential, "api/v1/jobs/createTask", {
    method: "POST",
    json: { model: model.endpoint, input: buildModelInput(model, params) },
  });
  const taskId = data?.taskId;
  if (!taskId) throw new Error("kie did not return a task id.");
  params.onRequestId?.(taskId);

  const snapshot = await waitForJob(
    async () => toSnapshot(await call(credential, `api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`)),
    { requestId: taskId, interval, maxAttempts: Math.ceil((60 * 60 * 1000) / interval) },
  );
  return toGenerationResult(snapshot, taskId);
}

const IMAGE = { interval: 3000 };
const VIDEO = { interval: 5000 };

export const kieProvider = defineProvider({
  id: PROVIDER_ID,
  name: "kie.ai",
  credential: {
    fields: [{ name: "key", label: "API key", secret: true }],
    helpUrl: "https://kie.ai/api-key",
  },
  capabilities: [
    Capability.TEXT_TO_IMAGE,
    Capability.IMAGE_TO_IMAGE,
    Capability.TEXT_TO_VIDEO,
    Capability.IMAGE_TO_VIDEO,
    Capability.LIPSYNC,
    Capability.AUDIO,
    Capability.UPLOAD,
    Capability.BALANCE,
  ],
  catalog: kieCatalog,

  generateImage: (credential, params) => runModel(credential, kieCatalog.getModelById(params.model), params, IMAGE),
  generateI2I: (credential, params) => runModel(credential, kieCatalog.getI2IModelById(params.model), params, IMAGE),
  generateVideo: (credential, params) => runModel(credential, kieCatalog.getVideoModelById(params.model), params, VIDEO),
  generateI2V: (credential, params) => runModel(credential, kieCatalog.getI2VModelById(params.model), params, VIDEO),
  processLipSync: (credential, params) =>
    runModel(credential, kieCatalog.getLipSyncModelById(params.model), params, VIDEO),
  generateAudio: (credential, params) =>
    runModel(credential, kieCatalog.getAudioModelById(params._modelId || params.model), params, VIDEO),

  async uploadFile(credential, file, onProgress) {
    // Canvas exports (DrawModal) are nameless blobs.
    const baseName = file.name || `upload.${file.type?.split("/")[1] || "bin"}`;
    // Same uploadPath + fileName overwrite each other on kie's side.
    const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${baseName}`;
    const formData = new FormData();
    formData.append("uploadPath", UPLOAD_FOLDER);
    formData.append("fileName", fileName);
    formData.append("file", file, fileName);
    const body = await providerUpload(PROVIDER_ID, {
      upstream: "upload",
      path: "api/file-stream-upload",
      formData,
      credential,
      onProgress,
    });
    const data = unwrap(body, "File upload");
    const url = data?.downloadUrl || data?.fileUrl;
    if (!url) throw new Error("No URL returned from file upload");
    return url;
  },

  async getUserBalance(credential) {
    const credits = Number(await call(credential, "api/v1/chat/credit")) || 0;
    // The header shows dollars; kie bills in credits (1 credit = $0.005).
    return { balance: Number((credits * USD_PER_CREDIT).toFixed(2)), credits };
  },
});
