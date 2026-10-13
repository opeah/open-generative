import { CREDENTIAL_HEADER } from "./client.js";

// Server side of the provider transport, used by the Next.js route
// app/api/providers/[provider]/[upstream]/[[...path]]. Each provider declares
// the hosts it may reach ("upstreams") and how a stored credential becomes
// auth headers; the route forwards the request and streams the response back.
// A provider can also declare server-side "actions" for multi-step calls the
// browser can't make itself (e.g. uploading to a presigned storage URL).

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept"];
const FORWARDED_RESPONSE_HEADERS = ["content-type"];

/**
 * @param {Object} transport
 * @param {string} transport.id
 * @param {Record<string, string>} transport.upstreams   name → base URL
 * @param {(credential: string) => Record<string, string>} transport.authHeaders
 * @param {Record<string, string>} [transport.headers]    extra headers on every call
 * @param {string[]} [transport.mediaOrigins]            hosts serving outputs, allowed in the CSP
 * @param {Record<string, (context: { request: Request, credential: string, path: string }) => Promise<Response>>} [transport.actions]
 *        served at /api/providers/<id>/<action name>/… instead of being proxied
 */
export function defineTransport(transport) {
  if (!transport.id || !transport.upstreams || typeof transport.authHeaders !== "function") {
    throw new Error("A transport needs an id, upstreams and authHeaders().");
  }
  return Object.freeze(transport);
}

export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function resolveTarget(base, path, search) {
  const baseUrl = new URL(base);
  const target = new URL(`${baseUrl.pathname.replace(/\/$/, "")}/${path}${search}`, baseUrl.origin);
  // The path comes from the browser: never let it point at another host.
  return target.origin === baseUrl.origin ? target : null;
}

export async function proxyProviderRequest(request, transport, { upstream, path }) {
  const action = transport.actions?.[upstream];
  const base = transport.upstreams[upstream];
  if (!action && !base) return jsonResponse(404, { error: `Unknown upstream "${upstream}" for ${transport.id}` });

  const credential = request.headers.get(CREDENTIAL_HEADER)?.trim();
  if (!credential) return jsonResponse(401, { error: `Missing ${transport.id} credential` });
  if (action) return action({ request, credential, path });

  const target = resolveTarget(base, path, new URL(request.url).search);
  if (!target) return jsonResponse(400, { error: "Invalid upstream path" });

  const headers = new Headers(transport.headers || {});
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const [name, value] of Object.entries(transport.authHeaders(credential))) headers.set(name, value);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch (error) {
    return jsonResponse(502, { error: `${transport.id} is unreachable: ${error.message}` });
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
}
