// Browser side of the provider transport. Provider APIs are never called
// from the browser directly: requests go to the Next.js route
// /api/providers/<provider>/<upstream>/<path>, which adds the provider's auth
// header server-side (no CORS issues, and the auth scheme stays out of the UI).

export const CREDENTIAL_HEADER = "x-provider-credential";
const PROXY_ROOT = "/api/providers";
const UPLOAD_TIMEOUT_MS = 300_000;
const UPLOAD_PENDING_PROGRESS = 99;

export class ProviderHttpError extends Error {
  constructor(message, { status = 0, body, retryable = false } = {}) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
    this.body = body;
    this.retryable = retryable;
  }
}

function proxyUrl(providerId, upstream, path) {
  if (typeof window === "undefined" || !window.location?.protocol?.startsWith("http")) {
    throw new Error(`The ${providerId} provider needs the Next.js server (npm run dev) to reach its API.`);
  }
  return `${PROXY_ROOT}/${providerId}/${upstream}/${String(path).replace(/^\/+/, "")}`;
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function notifyAuthRequired(providerId, status, detail) {
  if (typeof window === "undefined" || (status !== 401 && status !== 403)) return;
  window.dispatchEvent(new CustomEvent("provider:auth-required", { detail: { providerId, status, message: detail } }));
}

function errorDetail(data, text) {
  const detail = data?.msg || data?.message || data?.detail || data?.error || text || "";
  // FastAPI-style validation errors: [{ loc: [...], msg }]
  if (Array.isArray(detail)) {
    return detail.map((item) => [item?.loc?.slice(1).join("."), item?.msg].filter(Boolean).join(": ")).join("; ");
  }
  return typeof detail === "string" ? detail : JSON.stringify(detail);
}

function httpError(providerId, label, status, text, data) {
  const detail = errorDetail(data, text);
  notifyAuthRequired(providerId, status, detail);
  return new ProviderHttpError(`${label} failed: ${status} - ${String(detail).slice(0, 200)}`, {
    status,
    body: data ?? text,
    retryable: status >= 500 || status === 429,
  });
}

/** JSON request through the proxy. Resolves with the parsed body. */
export async function providerRequest(providerId, { upstream = "api", path, method = "GET", json, credential, signal }) {
  const headers = { [CREDENTIAL_HEADER]: credential };
  if (json !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(proxyUrl(providerId, upstream, path), {
      method,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      signal,
    });
  } catch (error) {
    throw new ProviderHttpError(`Network error calling ${providerId}: ${error.message}`, { retryable: true });
  }

  const text = await response.text();
  const data = parseJson(text);
  if (!response.ok) throw httpError(providerId, `${method} ${path}`, response.status, text, data);
  return data;
}

/** Multipart upload through the proxy, with progress. Resolves with the parsed body. */
export function providerUpload(providerId, { upstream = "api", path, formData, credential, onProgress, method = "POST" }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, proxyUrl(providerId, upstream, path));
    xhr.setRequestHeader(CREDENTIAL_HEADER, credential);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress(Math.min(Math.round((event.loaded / event.total) * 100), UPLOAD_PENDING_PROGRESS));
      };
    }

    xhr.onload = () => {
      const data = parseJson(xhr.responseText);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(httpError(providerId, "File upload", xhr.status, xhr.responseText, data));
        return;
      }
      onProgress?.(100);
      resolve(data);
    };
    xhr.onerror = () => reject(new ProviderHttpError("Network error during file upload", { retryable: true }));
    xhr.ontimeout = () => reject(new ProviderHttpError("File upload timed out. Please try again."));
    xhr.send(formData);
  });
}
