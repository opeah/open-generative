# Generation providers

The studios can run on several generation APIs. One provider is active at a
time (chosen in the API key screen or in Settings); its models fill the
studios and every generation goes through it.

| Provider | Studios | Auth | Notes |
|---|---|---|---|
| MuAPI | all | `x-api-key` | Upstream default. Keeps its own proxy routes. |
| kie.ai | Image, Video, Lip Sync, Audio | `Authorization: Bearer` | HTTP 200 with an error `code` in the body. Outputs kept 14 days, uploads 24 h. Balance shown in dollars (1 credit = $0.005). |
| Higgsfield | Image, Video | `Authorization: Key <id>:<secret>` | No lipsync/audio models and no balance endpoint in the public API. Browser calls blocked by CORS. Outputs kept 7 days. |

## Architecture

Ports and adapters. Studios only know the port; each provider is an adapter.

```
studios (ImageStudio, VideoStudio, LipSyncStudio, AudioStudio, DrawModal)
   │  import { generateImage, … } from "generation.js"   ← facade, same API as muapi.js
   │  import { t2iModels, … }      from "catalog.js"      ← facade, same API as models.js
   ▼
providers/
  domain/        capabilities, provider port, job lifecycle, generic catalog, payload mapping
  transport/     browser → /api/providers/<id>/<upstream>/<path> → provider API
  registry.js    known providers          settings.js   active provider + stored keys
  index.js       composition root (client) server.js    composition root (proxy route)
  muapi/         wraps the untouched muapi.js + models.js
  kie/           index.js (adapter) · catalog.js (models) · transport.js (hosts + auth)
  higgsfield/    same layout; transport.js also runs the presigned upload server-side
```

- **Capabilities** (`domain/capabilities.js`): a provider lists what it can do
  (text-to-image, image-to-video, lipsync…). The shell only shows and mounts the
  studios the active provider supports, so a MuAPI-only studio never sends
  another provider's key to MuAPI.
- **Catalog** (`domain/catalog.js`): model entries use the studio schema the UI
  already renders (`inputs` with `enum`/`default`/`minValue`…, `imageField`,
  `lastImageField`, `maxImages`…). `createCatalog()` returns the same helpers as
  `models.js`, so the studios work unchanged. `endpoint` is the provider's model id.
- **Schema builders** (`domain/schema.js`): `choice`, `aspectRatio`, `duration`…
  and `imageModelPair` / `videoModelPair`, which create a model's text-to-X and
  image-to-X variants (the studios group them into one family).
- **Payload** (`domain/payload.js`): `buildModelInput(model, params)` turns what
  the studios send (`prompt`, `aspect_ratio`, `images_list`, `last_image`,
  `audio_url`…) into the inputs the model declares, using the provider's own
  parameter names.
- **Jobs** (`domain/job.js`): every provider is submit → id → poll. Adapters map
  their status payload to a `JobSnapshot`; `waitForJob()` does the polling.
- **Transport**: provider APIs are called through the Next.js route
  `app/api/providers/[provider]/[upstream]/[[...path]]`. The browser sends the
  stored key in `x-provider-credential`; the route turns it into the provider's
  auth header and refuses paths that leave the declared hosts. Multi-step calls
  the browser can't make (Higgsfield's presigned upload) are transport
  `actions`, run server-side. Each transport lists its `mediaOrigins`, which
  `middleware.js` adds to the CSP so results can be fetched for downloads.

The catalog facade is resolved once when the studios load, so switching
provider reloads the page.

## Adding a provider

1. `providers/<id>/transport.js`: `defineTransport({ id, upstreams, authHeaders, mediaOrigins, actions? })`.
   Register it in `providers/server.js`.
2. `providers/<id>/catalog.js`: the models, built with the `domain/schema.js` helpers and
   `createCatalog({ t2iModels, i2iModels, t2vModels, i2vModels, lipsyncModels, audioModels })`.
   Prefix ids with `<id>-` so they never collide with MuAPI-specific helpers keyed
   on model ids. Use `aliases` for model ids hardcoded in studios (DrawModal).
3. `providers/<id>/index.js`: `defineProvider({ id, name, credential, capabilities, catalog, generateImage, … })`.
   Build inputs with `buildModelInput`, call the API with `providerRequest` /
   `providerUpload`, poll with `waitForJob`, return `toGenerationResult`.
   `defineProvider` refuses a capability without its operation.
4. Register it in `providers/index.js`.
5. Add tests next to `tests/providers.test.mjs`.

## Upstream merges

`muapi.js` and `models.js` are untouched. Upstream changes that touch this layer:

- studio imports of `muapi.js` / `models.js` were repointed to `generation.js` /
  `catalog.js` (one line each in ImageStudio, VideoStudio, LipSyncStudio,
  AudioStudio, DrawModal, modelFamilies);
- `components/StandaloneShell.js` and `components/ApiKeyModal.js` (provider
  choice, per-provider keys, studio filtering);
- `middleware.js` (provider media hosts in the CSP) and `packages/studio/package.json`
  (`studio/providers/server` export for the proxy route).

A new helper exported by `models.js` needs a matching line in `catalog.js` and in
`createCatalog()`; `tests/providers.test.mjs` fails until both exist.

## Tests

```bash
node --test tests/providers.test.mjs
```
