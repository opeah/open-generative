import { defineTransport } from "../transport/server.js";

// Cloudflare in front of kie's upload host rejects non-browser user agents.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

export const kieTransport = defineTransport({
  id: "kie",
  upstreams: {
    api: "https://api.kie.ai",
    upload: "https://kieai.redpandaai.co",
  },
  authHeaders: (credential) => ({ Authorization: `Bearer ${credential}` }),
  headers: { "User-Agent": BROWSER_USER_AGENT },
  // Where generated files and uploads are served from (CORS-enabled), so the
  // studios can fetch them for downloads.
  mediaOrigins: ["https://*.aiquickdraw.com", "https://*.redpandaai.co"],
});
