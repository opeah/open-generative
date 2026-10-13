import { defineTransport, jsonResponse } from "../transport/server.js";

// Higgsfield blocks browser origins (CORS allowlist of its own sites), so
// every call goes through the server. Uploads are two steps: ask for a
// presigned URL, then PUT the bytes there. Both run server-side in the
// "upload" action, because the storage host and its CORS policy aren't
// documented.

const API = "https://api.higgsfield.ai";
const authHeaders = (credential) => ({ Authorization: `Key ${credential}` });

async function uploadThroughPresignedUrl({ request, credential }) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return jsonResponse(400, { error: "Missing file" });
  const contentType = file.type || "application/octet-stream";

  const ticketResponse = await fetch(`${API}/files/generate-upload-url`, {
    method: "POST",
    headers: { ...authHeaders(credential), "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!ticketResponse.ok) {
    return new Response(ticketResponse.body, {
      status: ticketResponse.status,
      headers: { "content-type": ticketResponse.headers.get("content-type") || "application/json" },
    });
  }
  const ticket = await ticketResponse.json();

  // Never send Higgsfield credentials to the storage host.
  const stored = await fetch(ticket.upload_url, {
    method: "PUT",
    headers: ticket.upload_headers || { "Content-Type": contentType },
    body: await file.arrayBuffer(),
  });
  if (!stored.ok) return jsonResponse(502, { error: `Storage upload failed: ${stored.status}` });

  return jsonResponse(200, { url: ticket.public_url });
}

export const higgsfieldTransport = defineTransport({
  id: "higgsfield",
  upstreams: { api: API },
  authHeaders,
  actions: { upload: uploadThroughPresignedUrl },
  // Public CDN seen serving Higgsfield media with CORS enabled.
  mediaOrigins: ["https://cdn.higgsfield.ai"],
});
