// Server-side composition root: provider transports used by the Next.js proxy
// route. Kept apart from providers/index.js so the server bundle never pulls
// the model catalogs or the browser-side adapters.
import { kieTransport } from "./kie/transport.js";
import { higgsfieldTransport } from "./higgsfield/transport.js";

const transports = new Map([kieTransport, higgsfieldTransport].map((transport) => [transport.id, transport]));

export function getProviderTransport(providerId) {
  return transports.get(providerId) || null;
}

/** CSP connect-src entries for every provider's media hosts. */
export function providerConnectSources() {
  return [...transports.values()].flatMap((transport) => transport.mediaOrigins || []);
}

export { proxyProviderRequest } from "./transport/server.js";
