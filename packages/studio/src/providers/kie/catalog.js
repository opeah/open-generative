import { createCatalog } from "../domain/catalog.js";
import {
  BRANDS,
  aspectRatio,
  choice,
  duration,
  imageModelPair,
  resolution,
  slider,
  text,
  toggle,
  variantLists,
  videoModelPair,
} from "../domain/schema.js";
import { ELEVENLABS_VOICES } from "./voices.js";

// kie.ai models in the studio schema. `endpoint` is kie's market model id
// (createTask's `model`); input names are kie's own parameter names, so the
// payload is built straight from what the studio controls send.
// Schemas: https://docs.kie.ai/llms.txt (market/*.md pages).
// Prices in descriptions: kie.ai/pricing, read 2026-10-07 (1 credit = $0.005).
//
// Ids are prefixed with "kie-" so they never match the MuAPI-specific helpers
// that key on model ids (seedanceModels.js, groupedVideoModels.js…).

// ── Images ─────────────────────────────────────────────────────────────────

const IMAGE_MODELS = [
  imageModelPair({
    idPrefix: "kie",
    slug: "gpt-image-2.5",
    name: "GPT Image 2.5",
    brand: "openai",
    description: "Versatile, readable text, transparent backgrounds. 6 / 10 / 16 credits (1K / 2K / 4K).",
    endpoints: { t2i: "gpt-image-2-5-sunburst-text-to-image", i2i: "gpt-image-2-5-sunburst-image-to-image" },
    inputs: {
      // 27:16, 16:27, 9:8 and 8:9 are 1K only.
      aspect_ratio: aspectRatio(
        ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9", "27:16", "16:27", "9:8", "8:9"],
        "auto",
      ),
      resolution: resolution(["1K", "2K", "4K"], "1K"),
      background: choice("background", "Background", ["auto", "transparent", "opaque"], "auto"),
    },
    references: { field: "input_urls", max: 16 },
  }),
  imageModelPair({
    idPrefix: "kie",
    slug: "nano-banana-pro",
    name: "Nano Banana Pro",
    brand: "google",
    description: "Faithful to references (product, face). 18 credits at 1K and 2K, 24 at 4K.",
    endpoints: { t2i: "nano-banana-pro", i2i: "nano-banana-pro" },
    inputs: {
      aspect_ratio: aspectRatio(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "auto"], "1:1"),
      resolution: resolution(["1K", "2K", "4K"], "2K"),
    },
    references: { field: "image_input", max: 8 },
    fixedInputs: { output_format: "png" },
  }),
  imageModelPair({
    idPrefix: "kie",
    slug: "nano-banana-2",
    name: "Nano Banana 2",
    brand: "google",
    description: "Fast, up to 14 references. 8 / 12 / 18 credits (1K / 2K / 4K).",
    endpoints: { t2i: "nano-banana-2", i2i: "nano-banana-2" },
    inputs: {
      aspect_ratio: aspectRatio(
        ["auto", "1:1", "2:3", "3:2", "1:4", "4:1", "3:4", "4:3", "4:5", "5:4", "1:8", "8:1", "9:16", "16:9", "21:9"],
        "auto",
      ),
      resolution: resolution(["1K", "2K", "4K"], "1K"),
    },
    references: { field: "image_input", max: 14 },
    fixedInputs: { output_format: "png" },
  }),
  imageModelPair({
    idPrefix: "kie",
    slug: "seedream-5-pro",
    name: "Seedream 5.0 Pro",
    brand: "bytedance",
    description: "Photorealism. 7 credits (basic, 1K) or 14 credits (high, 2K).",
    endpoints: { t2i: "seedream/5-pro-text-to-image", i2i: "seedream/5-pro-image-to-image" },
    inputs: {
      aspect_ratio: aspectRatio(["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"], "1:1"),
      quality: choice("quality", "Quality", ["basic", "high"], "basic"),
    },
    references: { field: "image_urls", max: 10 },
  }),
  imageModelPair({
    idPrefix: "kie",
    slug: "flux-2-pro",
    name: "Flux 2 Pro",
    brand: "bfl",
    description: "Cheapest, good artistic rendering. 5 / 7 credits (1K / 2K).",
    endpoints: { t2i: "flux-2/pro-text-to-image", i2i: "flux-2/pro-image-to-image" },
    inputs: {
      aspect_ratio: aspectRatio(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"], "1:1"),
      resolution: resolution(["1K", "2K"], "1K"),
    },
    // "auto" follows the first reference image, so it only exists with references.
    i2iInputs: { aspect_ratio: aspectRatio(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "auto"], "1:1") },
    references: { field: "input_urls", max: 8 },
  }),
];

// ── Videos ─────────────────────────────────────────────────────────────────
// Frame models take a first frame and an optional last frame; list models
// take an image array (first frame, then last frame).

const FRAMES = { imageField: "first_frame_url", lastImageField: "last_frame_url", maxImages: 2 };

const VIDEO_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

const VIDEO_MODELS = [
  videoModelPair({
    idPrefix: "kie",
    slug: "seedance-2.5",
    name: "Seedance 2.5",
    brand: "bytedance",
    description: "Best quality, up to 30 s. Per second: 28 / 63 / 158 credits (480p / 720p / 1080p).",
    endpoint: "bytedance/seedance-2-5",
    inputs: {
      aspect_ratio: aspectRatio(VIDEO_RATIOS, "16:9"),
      resolution: resolution(["480p", "720p", "1080p"], "720p"),
      duration: duration(4, 30, 5),
      generate_audio: toggle("generate_audio", "Generate Audio", true, "Generate a soundtrack with the video."),
    },
    i2v: { ...FRAMES, inputs: { aspect_ratio: aspectRatio(["adaptive", ...VIDEO_RATIOS], "adaptive") } },
  }),
  videoModelPair({
    idPrefix: "kie",
    slug: "seedance-2-fast",
    name: "Seedance 2.0 Fast",
    brand: "bytedance",
    description: "Fast and ~2.5× cheaper than 2.5. Per second: 11.7 / 24.8 credits (480p / 720p).",
    endpoint: "bytedance/seedance-2-fast",
    inputs: {
      aspect_ratio: aspectRatio(VIDEO_RATIOS, "16:9"),
      resolution: resolution(["480p", "720p"], "720p"),
      duration: duration(4, 15, 5),
      generate_audio: toggle("generate_audio", "Generate Audio", true, "Generate a soundtrack with the video."),
    },
    i2v: { ...FRAMES, inputs: { aspect_ratio: aspectRatio(["adaptive", ...VIDEO_RATIOS], "adaptive") } },
  }),
  videoModelPair({
    idPrefix: "kie",
    slug: "kling-3.0",
    name: "Kling 3.0",
    brand: "kling",
    description: "Stable motion, good value, 4K. Per second: 14 / 18 / 67 credits (std / pro / 4K), sound 20 / 27 / 67.",
    endpoint: "kling-3.0/video",
    inputs: {
      aspect_ratio: aspectRatio(["16:9", "9:16", "1:1"], "16:9", { omitWithImages: true }),
      mode: choice("mode", "Quality", ["std", "pro", "4K"], "std", { configurable: true }),
      duration: duration(3, 15, 5, { serializeAs: "string" }),
      sound: toggle("sound", "Sound", false, "Generate sound (billed at a higher rate)."),
    },
    // With images the output follows the first frame's ratio; a 2nd image is the last frame.
    i2v: { imageField: "image_urls", maxImages: 2, aspectRatioMode: "inherited" },
  }),
  videoModelPair({
    idPrefix: "kie",
    slug: "wan-3.0",
    name: "Wan 3.0",
    brand: "alibaba",
    description: "Cheapest per second, up to 30 s. Per second: 8 / 16 / 32 credits (480P / 720P / 1080P).",
    endpoint: "wan/3-0-video",
    inputs: {
      aspect_ratio: aspectRatio(["16:9", "4:3", "1:1", "3:4", "9:16"], "16:9"),
      resolution: resolution(["480P", "720P", "1080P"], "720P"),
      duration: duration(2, 30, 5),
      audio: toggle("audio", "Audio", true, "Generate a soundtrack with the video."),
    },
    i2v: {
      ...FRAMES,
      inputs: { aspect_ratio: aspectRatio(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"], "adaptive") },
    },
  }),
  videoModelPair({
    idPrefix: "kie",
    slug: "gemini-omni-flash",
    name: "Gemini Omni Flash",
    brand: "google",
    description: "Flat price per video, same price from 360p to 1080p. 63 / 84 / 105 / 126 credits (4 / 6 / 8 / 10 s).",
    endpoint: "google/gemini-omni-flash-1-1",
    inputs: {
      aspect_ratio: aspectRatio(["16:9", "9:16"], "16:9"),
      resolution: resolution(["360p", "720p", "1080p", "4k"], "1080p"),
      duration: { ...duration(4, 10, 6, { serializeAs: "string" }), enum: [4, 6, 8, 10] },
    },
    i2v: FRAMES,
  }),
];

// ── Lip sync ───────────────────────────────────────────────────────────────
// The studio sends image_url (or video_url) + audio_url; output length follows the audio.

const TALKING_PROMPT = "A person speaking naturally to the camera, with natural facial expressions.";
const PORTRAIT_LIPSYNC = { category: "image", imageField: "image_url", audioField: "audio_url" };
const VIDEO_LIPSYNC = { category: "video", videoField: "video_url", audioField: "audio_url", hasPrompt: false, promptField: null };

const LIPSYNC_MODELS = [
  {
    id: "kie-kling-avatar-pro",
    name: "Kling Avatar Pro",
    endpoint: "kling/ai-avatar-pro",
    description: "1080p talking portrait. 16 credits per second of audio.",
    hasPrompt: true,
    defaultPrompt: TALKING_PROMPT,
    ...PORTRAIT_LIPSYNC,
    ...BRANDS.kling,
  },
  {
    id: "kie-kling-avatar-standard",
    name: "Kling Avatar Standard",
    endpoint: "kling/ai-avatar-standard",
    description: "720p talking portrait. 8 credits per second of audio.",
    hasPrompt: true,
    defaultPrompt: TALKING_PROMPT,
    ...PORTRAIT_LIPSYNC,
    ...BRANDS.kling,
  },
  {
    id: "kie-infinitetalk",
    name: "InfiniteTalk",
    endpoint: "infinitalk/from-audio",
    description: "Cheapest talking portrait. Per second: 3 / 12 credits (480p / 720p).",
    hasPrompt: true,
    defaultPrompt: TALKING_PROMPT,
    ...PORTRAIT_LIPSYNC,
    inputs: { resolution: resolution(["480p", "720p"], "480p") },
  },
  {
    id: "kie-omnihuman-1.5",
    name: "OmniHuman 1.5",
    endpoint: "omnihuman-1-5",
    description: "People, pets or anime, audio under 60 s. 27 credits per second.",
    hasPrompt: true,
    ...PORTRAIT_LIPSYNC,
    ...BRANDS.bytedance,
    inputs: { resolution: { ...resolution(["720", "1080"], "1080"), sendAs: "output_resolution" } },
  },
  {
    id: "kie-video-lipsync-lite",
    name: "Video Lip Sync (single speaker)",
    endpoint: "volcengine/video-to-video-lip-sync",
    description: "Re-syncs the lips of a frontal single-person video. 8 credits per second.",
    fixedInputs: { mode: "lite" },
    ...VIDEO_LIPSYNC,
    ...BRANDS.bytedance,
  },
  {
    id: "kie-video-lipsync-basic",
    name: "Video Lip Sync (complex scenes)",
    endpoint: "volcengine/video-to-video-lip-sync",
    description: "Handles cuts and several speakers. 8 credits per second.",
    fixedInputs: { mode: "basic" },
    ...VIDEO_LIPSYNC,
    ...BRANDS.bytedance,
  },
];

// ── Audio ──────────────────────────────────────────────────────────────────
// The audio studio renders every declared input, so these use kie's names.

const SUNO_VERSIONS = ["V6", "V6_MINI", "V6_WILD"];

function elevenLabsTts({ id, name, endpoint, description }) {
  return {
    id,
    name,
    endpoint,
    description,
    family: "elevenlabs",
    promptField: null,
    required: ["text"],
    inputs: {
      text: text("text", "Text", "What the voice says (5000 characters max)."),
      voice: choice("voice", "Voice", ELEVENLABS_VOICES, ELEVENLABS_VOICES[0].value),
      stability: slider("stability", "Stability", 0, 1, 0.5),
      similarity_boost: slider("similarity_boost", "Similarity", 0, 1, 0.75),
      style: slider("style", "Style Exaggeration", 0, 1, 0),
      speed: slider("speed", "Speed", 0.7, 1.2, 1),
    },
  };
}

const AUDIO_MODELS = [
  {
    id: "kie-suno-music",
    name: "Suno Music",
    endpoint: "ai-music-api/generate",
    family: "suno",
    description: "Full songs with vocals or instrumentals. 2 tracks per request, 12 credits.",
    required: ["prompt"],
    inputs: {
      prompt: text("prompt", "Prompt", "The song idea. In custom mode, the lyrics."),
      model: choice("model", "Model", SUNO_VERSIONS, "V6"),
      custom_mode: toggle("custom_mode", "Custom Mode", false, "Use the prompt as lyrics and set the style and title yourself."),
      instrumental: toggle("instrumental", "Instrumental", false, "No vocals."),
      style: text("style", "Style", "Custom mode: genre, mood, instruments.", { placeholder: "Lo-fi hip hop, warm piano" }),
      title: text("title", "Title", "Custom mode: required, 80 characters max."),
      negative_tags: text("negative_tags", "Exclude Styles", "Custom mode: styles to avoid."),
    },
  },
  {
    id: "kie-suno-sounds",
    name: "Suno Sound Effects",
    endpoint: "ai-music-api/sounds",
    family: "suno",
    description: "Sound effects and loops from a description. 2.5 credits.",
    required: ["prompt"],
    inputs: {
      prompt: text("prompt", "Prompt", "The sound to create (500 characters max)."),
      model: choice("model", "Model", SUNO_VERSIONS, "V6"),
      sound_loop: toggle("sound_loop", "Seamless Loop", false, "Make the clip loop seamlessly."),
    },
  },
  elevenLabsTts({
    id: "kie-elevenlabs-turbo-2.5",
    name: "ElevenLabs Turbo 2.5",
    endpoint: "elevenlabs/text-to-speech-turbo-2-5",
    description: "Fast text to speech. 6 credits per 1000 characters.",
  }),
  elevenLabsTts({
    id: "kie-elevenlabs-multilingual-v2",
    name: "ElevenLabs Multilingual v2",
    endpoint: "elevenlabs/text-to-speech-multilingual-v2",
    description: "Most expressive text to speech, 29 languages. 12 credits per 1000 characters.",
  }),
  {
    id: "kie-elevenlabs-audio-isolation",
    name: "ElevenLabs Voice Isolation",
    endpoint: "elevenlabs/audio-isolation",
    family: "elevenlabs",
    description: "Removes background noise and music from speech (10 MB max).",
    promptField: null,
    audioField: "audio_url",
    required: ["audio_url"],
    inputs: { audio_url: { type: "string", title: "Audio", name: "audio_url", field: "audio" } },
  },
];

export const kieCatalog = createCatalog({
  ...variantLists(IMAGE_MODELS, [["t2i", "t2iModels"], ["i2i", "i2iModels"]]),
  ...variantLists(VIDEO_MODELS, [["t2v", "t2vModels"], ["i2v", "i2vModels"]]),
  lipsyncModels: LIPSYNC_MODELS,
  audioModels: AUDIO_MODELS,
  // DrawModal ("Draw to Edit") hardcodes MuAPI's Nano Banana edit models.
  aliases: {
    "nano-banana-pro-edit": "kie-nano-banana-pro-image-to-image",
    "nano-banana-2-edit": "kie-nano-banana-2-image-to-image",
  },
});
