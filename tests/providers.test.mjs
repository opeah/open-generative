import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import * as muapiModels from '../packages/studio/src/models.js';
import * as catalogFacade from '../packages/studio/src/catalog.js';
import { createCatalog } from '../packages/studio/src/providers/domain/catalog.js';
import { buildModelInput } from '../packages/studio/src/providers/domain/payload.js';
import { buildReferenceParams } from '../packages/studio/src/modelCapabilities.js';
import { defineProvider } from '../packages/studio/src/providers/domain/provider.js';
import { Capability, providerSupportsStudio } from '../packages/studio/src/providers/domain/capabilities.js';
import { kieCatalog } from '../packages/studio/src/providers/kie/catalog.js';
import { kieProvider } from '../packages/studio/src/providers/kie/index.js';
import { muapiProvider } from '../packages/studio/src/providers/muapi/index.js';
import { kieTransport } from '../packages/studio/src/providers/kie/transport.js';
import { higgsfieldCatalog } from '../packages/studio/src/providers/higgsfield/catalog.js';
import { higgsfieldProvider } from '../packages/studio/src/providers/higgsfield/index.js';
import { higgsfieldTransport } from '../packages/studio/src/providers/higgsfield/transport.js';
import { serializeCredential } from '../packages/studio/src/providers/domain/provider.js';
import { proxyProviderRequest } from '../packages/studio/src/providers/transport/server.js';

// ── Catalog contract ─────────────────────────────────────────────────────────

test('a generic catalog exposes every export of models.js', () => {
  // Guards against upstream adding a models.js helper the facade would miss.
  const generic = createCatalog();
  for (const name of Object.keys(muapiModels)) {
    assert.ok(name in generic, `createCatalog() is missing "${name}"`);
  }
});

test('the catalog facade mirrors models.js and defaults to MuAPI', () => {
  assert.deepEqual(Object.keys(catalogFacade).sort(), Object.keys(muapiModels).sort());
  assert.equal(catalogFacade.t2iModels, muapiModels.t2iModels);
  assert.equal(catalogFacade.getAspectRatiosForModel, muapiModels.getAspectRatiosForModel);
});

for (const [prefix, catalog] of [['kie', kieCatalog], ['higgsfield', higgsfieldCatalog]]) {
  test(`${prefix} model ids are unique, prefixed and point at an endpoint`, () => {
    const lists = ['t2iModels', 'i2iModels', 't2vModels', 'i2vModels', 'lipsyncModels', 'audioModels'];
    const ids = new Set();
    for (const list of lists) {
      for (const model of catalog[list]) {
        assert.ok(model.id.startsWith(`${prefix}-`), model.id);
        assert.ok(model.endpoint, `${model.id} has no endpoint`);
        assert.ok(!ids.has(model.id), `duplicate id ${model.id}`);
        ids.add(model.id);
      }
    }
  });
}

test('catalog aliases resolve hardcoded studio model ids', () => {
  assert.equal(kieCatalog.getI2IModelById('nano-banana-pro-edit').id, 'kie-nano-banana-pro-image-to-image');
});

// ── Payload mapping ──────────────────────────────────────────────────────────

test('image-to-image references land in the model image field', () => {
  const model = kieCatalog.getI2IModelById('kie-nano-banana-pro-image-to-image');
  const input = buildModelInput(model, {
    model: model.id,
    prompt: '  a red chair ',
    images_list: ['https://x/a.png', 'https://x/b.png'],
    image_url: 'https://x/a.png',
    aspect_ratio: '4:5',
    resolution: '2K',
    swap_url: 'ignored',
  });
  assert.deepEqual(input, {
    output_format: 'png',
    prompt: 'a red chair',
    aspect_ratio: '4:5',
    resolution: '2K',
    image_input: ['https://x/a.png', 'https://x/b.png'],
  });
});

test('first/last frame models get separate frame fields', () => {
  const model = kieCatalog.getI2VModelById('kie-seedance-2.5-image-to-video');
  const params = buildReferenceParams(model, { imageUrls: ['https://x/first.png', 'https://x/last.png'] });
  const input = buildModelInput(model, { ...params, prompt: 'go', duration: 8, resolution: '1080p', generate_audio: false });
  assert.equal(input.first_frame_url, 'https://x/first.png');
  assert.equal(input.last_frame_url, 'https://x/last.png');
  assert.equal(input.duration, 8);
  assert.equal(input.generate_audio, false);
});

test('Kling sends duration as a string and drops the ratio with images', () => {
  const model = kieCatalog.getI2VModelById('kie-kling-3.0-image-to-video');
  const params = buildReferenceParams(model, { imageUrls: ['https://x/1.png'] });
  const input = buildModelInput(model, { ...params, prompt: 'go', duration: 5, aspect_ratio: '16:9', mode: 'pro' });
  assert.deepEqual(input, {
    prompt: 'go',
    mode: 'pro',
    duration: '5',
    image_urls: ['https://x/1.png'],
  });
});

test('values outside an enum fall back to the default', () => {
  const model = kieCatalog.getModelById('kie-seedream-5-pro-text-to-image');
  assert.equal(buildModelInput(model, { prompt: 'x', aspect_ratio: '4:5' }).aspect_ratio, '1:1');
});

test('lip sync models get their media fields, default prompt and renamed inputs', () => {
  const avatar = kieCatalog.getLipSyncModelById('kie-kling-avatar-pro');
  assert.deepEqual(buildModelInput(avatar, { model: avatar.id, image_url: 'https://x/face.png', audio_url: 'https://x/voice.mp3' }), {
    prompt: avatar.defaultPrompt,
    image_url: 'https://x/face.png',
    audio_url: 'https://x/voice.mp3',
  });

  const omnihuman = kieCatalog.getLipSyncModelById('kie-omnihuman-1.5');
  const input = buildModelInput(omnihuman, { image_url: 'https://x/a.png', audio_url: 'https://x/a.mp3', resolution: '720' });
  assert.equal(input.output_resolution, '720');
  assert.equal(input.resolution, undefined);

  const relip = kieCatalog.getLipSyncModelById('kie-video-lipsync-lite');
  assert.deepEqual(buildModelInput(relip, { video_url: 'https://x/v.mp4', audio_url: 'https://x/a.mp3', prompt: 'ignored' }), {
    mode: 'lite',
    video_url: 'https://x/v.mp4',
    audio_url: 'https://x/a.mp3',
  });
});

test('audio studio params map to kie inputs, labelled options included', () => {
  const tts = kieCatalog.getAudioModelById('kie-elevenlabs-turbo-2.5');
  const voice = tts.inputs.voice.enum[3].value;
  const input = buildModelInput(tts, {
    _modelId: tts.id, text: 'Bonjour', voice, stability: 0.4, similarity_boost: 0.75, style: 0, speed: 1, prompt: '',
  });
  assert.deepEqual(input, { text: 'Bonjour', voice, stability: 0.4, similarity_boost: 0.75, style: 0, speed: 1 });

  const isolation = kieCatalog.getAudioModelById('kie-elevenlabs-audio-isolation');
  assert.deepEqual(buildModelInput(isolation, { audio_url: 'https://x/a.mp3' }), { audio_url: 'https://x/a.mp3' });
});

// ── Provider port ────────────────────────────────────────────────────────────

test('a provider must implement the operations of its capabilities', () => {
  assert.throws(
    () => defineProvider({ id: 'x', name: 'X', catalog: {}, capabilities: [Capability.TEXT_TO_IMAGE] }),
    /generateImage/,
  );
});

test('studio availability follows capabilities', () => {
  assert.equal(providerSupportsStudio(kieProvider, 'image'), true);
  assert.equal(providerSupportsStudio(kieProvider, 'workflows'), false);
  assert.equal(providerSupportsStudio(muapiProvider, 'workflows'), true);
});

// ── kie adapter lifecycle (fetch mocked) ─────────────────────────────────────

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function withFakeBrowser(handler, run) {
  globalThis.window = { location: { protocol: 'http:' } };
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return handler(url, init, calls);
  };
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const pending = run();
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });
    while (!settled) {
      await new Promise((resolve) => setImmediate(resolve));
      mock.timers.tick(5000);
    }
    return { result: await pending, calls };
  } finally {
    mock.timers.reset();
    globalThis.fetch = originalFetch;
    delete globalThis.window;
  }
}

test('kie: createTask, poll until success, return the first URL', async () => {
  let polls = 0;
  const { result, calls } = await withFakeBrowser((url) => {
    if (url.includes('createTask')) return jsonResponse({ code: 200, data: { taskId: 'task-1' } });
    polls += 1;
    return polls < 2
      ? jsonResponse({ code: 200, data: { state: 'generating' } })
      : jsonResponse({ code: 200, data: { state: 'success', resultJson: '{"resultUrls":["https://cdn/out.png"]}' } });
  }, () => kieProvider.generateImage('secret', { model: 'kie-flux-2-pro-text-to-image', prompt: 'cat', aspect_ratio: '16:9' }));

  assert.equal(result.url, 'https://cdn/out.png');
  assert.equal(result.request_id, 'task-1');
  assert.equal(calls[0].url, '/api/providers/kie/api/api/v1/jobs/createTask');
  assert.equal(calls[0].init.headers['x-provider-credential'], 'secret');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    model: 'flux-2/pro-text-to-image',
    input: { prompt: 'cat', aspect_ratio: '16:9' },
  });
  assert.equal(calls[1].url, '/api/providers/kie/api/api/v1/jobs/recordInfo?taskId=task-1');
});

test('kie: an error code in a 200 body rejects without polling', async () => {
  await assert.rejects(
    withFakeBrowser(
      () => jsonResponse({ code: 401, msg: 'You do not have access permissions' }),
      () => kieProvider.generateImage('bad', { model: 'kie-flux-2-pro-text-to-image', prompt: 'cat' }),
    ),
    (error) => error.status === 401 && error.retryable === false && /access permissions/.test(error.message),
  );
});

test('kie: a failed task surfaces failMsg', async () => {
  await assert.rejects(
    withFakeBrowser(
      (url) => url.includes('createTask')
        ? jsonResponse({ code: 200, data: { taskId: 'task-2' } })
        : jsonResponse({ code: 200, data: { state: 'fail', failMsg: 'NSFW content' } }),
      () => kieProvider.generateVideo('secret', { model: 'kie-wan-3.0-text-to-video', prompt: 'cat' }),
    ),
    /Generation failed: NSFW content/,
  );
});

test('kie: Suno tracks come back as outputs', async () => {
  const { result } = await withFakeBrowser(
    (url) => url.includes('createTask')
      ? jsonResponse({ code: 200, data: { taskId: 'suno-1' } })
      : jsonResponse({ code: 200, data: { state: 'success', response: { data: [
        { id: 'a', audio_url: 'https://cdn/a.mp3' },
        { id: 'b', audio_url: 'https://cdn/b.mp3' },
      ] } } }),
    () => kieProvider.generateAudio('secret', { _modelId: 'kie-suno-music', model: 'V6', prompt: 'summer song', custom_mode: false, instrumental: false }),
  );
  assert.equal(result.url, 'https://cdn/a.mp3');
  assert.deepEqual(result.outputs, ['https://cdn/a.mp3', 'https://cdn/b.mp3']);
});

test('higgsfield: flat body, poll the request, collect outputs; nsfw fails', async () => {
  let polls = 0;
  const { result, calls } = await withFakeBrowser((url) => {
    if (url.endsWith('/image-to-video')) return jsonResponse({ status: 'queued', request_id: 'req-1' });
    polls += 1;
    return polls < 2
      ? jsonResponse({ status: 'in_progress', request_id: 'req-1' })
      : jsonResponse({ status: 'completed', request_id: 'req-1', video: { url: 'https://cdn/v.mp4' } });
  }, () => {
    const model = higgsfieldCatalog.getI2VModelById('higgsfield-kling-3.0-pro-image-to-video');
    const media = buildReferenceParams(model, { imageUrls: ['https://x/first.png', 'https://x/last.png'] });
    return higgsfieldProvider.generateI2V('id:secret', { model: model.id, prompt: 'go', duration: 5, aspect_ratio: '16:9', sound: 'off', ...media });
  });
  assert.equal(result.url, 'https://cdn/v.mp4');
  assert.equal(calls[0].url, '/api/providers/higgsfield/api/kling-video/v3.0/pro/image-to-video');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    prompt: 'go', duration: 5, sound: 'off', image_url: 'https://x/first.png', last_image_url: 'https://x/last.png',
  });
  assert.equal(calls[1].url, '/api/providers/higgsfield/api/requests/req-1/status');

  await assert.rejects(
    withFakeBrowser(
      (url) => url.includes('/requests/')
        ? jsonResponse({ status: 'nsfw', request_id: 'req-2' })
        : jsonResponse({ status: 'queued', request_id: 'req-2' }),
      () => higgsfieldProvider.generateImage('id:secret', { model: 'higgsfield-soul-v2-text-to-image', prompt: 'x' }),
    ),
    /content moderation/,
  );
});

test('higgsfield credentials join id and secret for the Key scheme', () => {
  const credential = serializeCredential(higgsfieldProvider.credential, { id: ' abc ', secret: 'xyz' });
  assert.equal(credential, 'abc:xyz');
  assert.deepEqual(higgsfieldTransport.authHeaders(credential), { Authorization: 'Key abc:xyz' });
});

test('higgsfield upload action: presigned URL, PUT without credentials, public URL back', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/files/generate-upload-url')) {
      return jsonResponse({ public_url: 'https://cdn/in.png', upload_url: 'https://storage/put?sig=1', upload_headers: { 'Content-Type': 'image/png', 'x-amz-tagging': 'retention=temporary' } });
    }
    return new Response(null, { status: 200 });
  };
  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'a.png');
    const request = new Request('http://localhost/api/providers/higgsfield/upload', {
      method: 'POST', body: form, headers: { 'x-provider-credential': 'id:secret' },
    });
    const response = await proxyProviderRequest(request, higgsfieldTransport, { upstream: 'upload', path: '' });
    assert.deepEqual(await response.json(), { url: 'https://cdn/in.png' });
    assert.equal(JSON.parse(calls[0].init.body).content_type, 'image/png');
    assert.equal(calls[0].init.headers.Authorization, 'Key id:secret');
    assert.equal(calls[1].url, 'https://storage/put?sig=1');
    assert.equal(calls[1].init.method, 'PUT');
    assert.equal(calls[1].init.headers.Authorization, undefined);
    assert.equal(calls[1].init.headers['x-amz-tagging'], 'retention=temporary');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Server proxy ─────────────────────────────────────────────────────────────

test('proxy adds the provider auth header and targets the upstream host', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (url, init) => {
    forwarded = { url: String(url), init };
    return jsonResponse({ code: 200, data: 42 });
  };
  try {
    const request = new Request('http://localhost/api/providers/kie/api/api/v1/chat/credit?x=1', {
      headers: { 'x-provider-credential': 'secret', cookie: 'muapi_key=leak' },
    });
    const response = await proxyProviderRequest(request, kieTransport, { upstream: 'api', path: 'api/v1/chat/credit' });
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, 'https://api.kie.ai/api/v1/chat/credit?x=1');
    assert.equal(forwarded.init.headers.get('authorization'), 'Bearer secret');
    assert.equal(forwarded.init.headers.get('cookie'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('proxy refuses requests without credential or leaving the upstream host', async () => {
  const noKey = new Request('http://localhost/api/providers/kie/api/x');
  assert.equal((await proxyProviderRequest(noKey, kieTransport, { upstream: 'api', path: 'x' })).status, 401);

  const withKey = new Request('http://localhost/api/providers/kie/api/x', { headers: { 'x-provider-credential': 'k' } });
  assert.equal((await proxyProviderRequest(withKey, kieTransport, { upstream: 'nope', path: 'x' })).status, 404);
  assert.equal((await proxyProviderRequest(withKey, kieTransport, { upstream: 'api', path: '/evil.example/x' })).status, 400);
});
