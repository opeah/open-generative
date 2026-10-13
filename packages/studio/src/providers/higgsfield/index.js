import { Capability } from "../domain/capabilities.js";
import { defineProvider } from "../domain/provider.js";
import { JobState, toGenerationResult, waitForJob } from "../domain/job.js";
import { buildModelInput } from "../domain/payload.js";
import { providerRequest, providerUpload } from "../transport/client.js";
import { higgsfieldCatalog } from "./catalog.js";

// Higgsfield adapter. One lifecycle for every model:
//   POST <endpoint id> { …inputs at the top level } → { request_id, status: "queued" }
//   GET  requests/<id>/status → queued | in_progress | completed | failed | nsfw | canceled
// Outputs: images[].url, video.url, audio.url / audios[].url.
// Docs: https://docs.higgsfield.ai/docs. There is no balance endpoint.

const PROVIDER_ID = "higgsfield";

const call = (credential, path, { method = "GET", json } = {}) =>
  providerRequest(PROVIDER_ID, { path, method, json, credential });

function outputUrls(status) {
  const urls = [
    ...(status.images || []).map((image) => image?.url),
    status.video?.url,
    status.audio?.url,
    ...(status.audios || []).map((audio) => audio?.url),
  ];
  return [...new Set(urls.filter(Boolean))];
}

const FAILURES = {
  failed: (status) => status.error || "Generation failed",
  nsfw: () => "Rejected by Higgsfield's content moderation",
  canceled: () => "Canceled",
};

function toSnapshot(status) {
  if (status?.status === "completed") return { state: JobState.SUCCEEDED, outputs: outputUrls(status), raw: status };
  const failure = FAILURES[status?.status];
  if (failure) return { state: JobState.FAILED, error: failure(status), raw: status };
  return { state: JobState.RUNNING, raw: status };
}

async function runModel(credential, model, params, { interval }) {
  if (!model) throw new Error(`Unknown Higgsfield model "${params.model}".`);

  const submitted = await call(credential, model.endpoint, { method: "POST", json: buildModelInput(model, params) });
  const requestId = submitted?.request_id;
  if (!requestId) throw new Error("Higgsfield did not return a request id.");
  params.onRequestId?.(requestId);

  const snapshot = await waitForJob(
    async () => toSnapshot(await call(credential, `requests/${encodeURIComponent(requestId)}/status`)),
    { requestId, interval, maxAttempts: Math.ceil((60 * 60 * 1000) / interval) },
  );
  return toGenerationResult(snapshot, requestId);
}

const IMAGE = { interval: 3000 };
const VIDEO = { interval: 5000 };

export const higgsfieldProvider = defineProvider({
  id: PROVIDER_ID,
  name: "Higgsfield",
  credential: {
    // Sent as "Authorization: Key <id>:<secret>".
    fields: [
      { name: "id", label: "API key ID" },
      { name: "secret", label: "API key secret", secret: true },
    ],
    helpUrl: "https://console.higgsfield.ai",
  },
  capabilities: [
    Capability.TEXT_TO_IMAGE,
    Capability.IMAGE_TO_IMAGE,
    Capability.TEXT_TO_VIDEO,
    Capability.IMAGE_TO_VIDEO,
    Capability.UPLOAD,
  ],
  catalog: higgsfieldCatalog,

  generateImage: (credential, params) => runModel(credential, higgsfieldCatalog.getModelById(params.model), params, IMAGE),
  generateI2I: (credential, params) => runModel(credential, higgsfieldCatalog.getI2IModelById(params.model), params, IMAGE),
  generateVideo: (credential, params) =>
    runModel(credential, higgsfieldCatalog.getVideoModelById(params.model), params, VIDEO),
  generateI2V: (credential, params) => runModel(credential, higgsfieldCatalog.getI2VModelById(params.model), params, VIDEO),

  // The two-step presigned upload runs server-side (see transport.js).
  async uploadFile(credential, file, onProgress) {
    const formData = new FormData();
    formData.append("file", file, file.name || `upload.${file.type?.split("/")[1] || "bin"}`);
    const body = await providerUpload(PROVIDER_ID, { upstream: "upload", path: "", formData, credential, onProgress });
    if (!body?.url) throw new Error("No URL returned from file upload");
    return body.url;
  },
});
