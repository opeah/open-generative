import { createCatalog } from "../domain/catalog.js";
import {
  aspectRatio,
  choice,
  duration,
  imageModelPair,
  resolution,
  text,
  toggle,
  variantLists,
  videoModelPair,
} from "../domain/schema.js";

// Higgsfield models in the studio schema. `endpoint` is the Higgsfield
// endpoint id (POST https://api.higgsfield.ai/<endpoint>); input names are the
// API's own. Many schemas reject unknown keys, so entries only declare
// documented fields. Schemas: https://docs.higgsfield.ai/docs (model pages),
// read 2026-10-13. A curated subset of the 84 endpoints; add more the same way.
// Prices aren't published per model: POST /estimate/<endpoint> returns them.

const ID = "higgsfield";

// ── Images ─────────────────────────────────────────────────────────────────

const IMAGE_MODELS = [
  imageModelPair({
    idPrefix: ID,
    slug: "soul-v2",
    name: "SOUL V2",
    brand: "higgsfield",
    description: "Higgsfield's photographic model, fashion and portrait aesthetics.",
    endpoints: { t2i: "higgsfield-ai/soul/v2/standard" },
    inputs: {
      aspect_ratio: aspectRatio(["1:1", "9:16", "16:9", "4:3", "3:4", "2:3", "3:2"], "1:1"),
      resolution: resolution(["720p", "1080p"], "720p"),
      enhance_prompt: toggle("enhance_prompt", "Enhance Prompt", false, "Let Higgsfield rewrite the prompt."),
    },
  }),
  imageModelPair({
    idPrefix: ID,
    slug: "gpt-image-2.5",
    name: "GPT Image 2.5",
    brand: "openai",
    description: "GPT Image 2.5 Sunburst (Marketing Studio). Up to 16 references.",
    endpoints: { t2i: "marketing-studio/image/sunburst", i2i: "marketing-studio/image/sunburst" },
    inputs: {
      aspect_ratio: aspectRatio(["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"], "auto"),
      resolution: resolution(["1k", "2k", "4k"], "2k"),
      quality: choice("quality", "Quality", ["low", "medium", "high", "xhigh", "max"], "high", { configurable: true }),
    },
    references: { field: "image_urls", max: 16 },
  }),
  imageModelPair({
    idPrefix: ID,
    slug: "grok-image-2.0",
    name: "Grok Image 2.0",
    brand: "xai",
    description: "Generate and edit, up to 10 references.",
    endpoints: { t2i: "xai/grok-imagine-image-2.0", i2i: "xai/grok-imagine-image-2.0" },
    inputs: {
      aspect_ratio: aspectRatio(["auto", "1:1", "1:2", "2:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"], "auto"),
      resolution: resolution(["1k", "2k"], "1k"),
      quality: choice("quality", "Quality", ["low", "medium"], "medium", { configurable: true }),
    },
    references: { field: "image_urls", max: 10 },
  }),
  imageModelPair({
    idPrefix: ID,
    slug: "qwen-image-3",
    name: "Qwen Image 3",
    brand: "alibaba",
    description: "Strong text rendering; edit mode takes up to 3 images.",
    endpoints: { t2i: "alibaba/qwen-image-3/text-to-image", i2i: "alibaba/qwen-image-3/edit" },
    inputs: {
      aspect_ratio: aspectRatio(["1:1", "2:3", "3:2", "3:4", "4:3", "7:9", "9:7", "9:16", "16:9", "21:9"], "1:1"),
      resolution: resolution(["1k", "2k"], "1k"),
      negative_prompt: text("negative_prompt", "Negative Prompt", "What to avoid."),
    },
    references: { field: "image_urls", max: 3 },
  }),
  imageModelPair({
    idPrefix: ID,
    slug: "ideogram-4.0",
    name: "Ideogram 4.0",
    brand: "ideogram",
    description: "Typography and graphic design; one optional reference image.",
    endpoints: { t2i: "ideogram/v4.0", i2i: "ideogram/v4.0" },
    inputs: {
      aspect_ratio: aspectRatio(
        ["1:1", "1:2", "2:1", "2:3", "3:2", "4:5", "5:4", "9:16", "16:9", "5:8", "8:5", "3:4", "4:3", "1:3", "3:1"],
        "1:1",
      ),
      rendering_speed: choice("rendering_speed", "Rendering", ["TURBO", "DEFAULT", "QUALITY"], "DEFAULT"),
    },
    references: { field: "image_url", max: 1 },
  }),
];

// ── Videos ─────────────────────────────────────────────────────────────────
// Image-to-video endpoints take image_url plus an optional last frame whose
// name varies by family. When the output follows the first frame, the ratio
// is declared on both variants but dropped with images (omitWithImages), so
// the picker shows one entry per model.

const INHERITED_RATIO = { aspectRatioMode: "inherited" };
const lastFrame = (lastImageField) => ({ imageField: "image_url", lastImageField, maxImages: 2, ...INHERITED_RATIO });

function kling30(tier, name) {
  return videoModelPair({
    idPrefix: ID,
    slug: `kling-3.0-${tier}`,
    name,
    brand: "kling",
    description: tier === "pro" ? "1080p, stable motion, optional last frame." : "720p, stable motion, optional last frame.",
    endpoints: {
      t2v: `kling-video/v3.0/${tier}/text-to-video`,
      i2v: `kling-video/v3.0/${tier}/image-to-video`,
    },
    inputs: {
      aspect_ratio: aspectRatio(["16:9", "9:16", "1:1"], "16:9", { omitWithImages: true }),
      duration: duration(3, 15, 5),
      sound: choice("sound", "Sound", ["on", "off"], "on"),
    },
    i2v: lastFrame("last_image_url"),
  });
}

const VIDEO_MODELS = [
  kling30("std", "Kling 3.0 Standard"),
  kling30("pro", "Kling 3.0 Pro"),
  videoModelPair({
    idPrefix: ID,
    slug: "seedance-2.5",
    name: "Seedance 2.5",
    brand: "bytedance",
    description: "Best quality, up to 30 s, native audio.",
    endpoints: {
      t2v: "bytedance/seedance-2.5/text-to-video",
      i2v: "bytedance/seedance-2.5/image-to-video",
    },
    inputs: {
      aspect_ratio: aspectRatio(["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"], "16:9", { omitWithImages: true }),
      resolution: resolution(["480p", "720p", "1080p"], "720p"),
      duration: duration(4, 30, 5),
      generate_audio: toggle("generate_audio", "Generate Audio", true, "Generate a soundtrack with the video."),
    },
    i2v: lastFrame("end_image_url"),
  }),
  videoModelPair({
    idPrefix: ID,
    slug: "wan-3.0",
    name: "Wan 3.0",
    brand: "alibaba",
    description: "Up to 30 s, native audio.",
    endpoints: {
      t2v: "alibaba/wan-3.0/text-to-video",
      i2v: "alibaba/wan-3.0/image-to-video",
    },
    inputs: {
      aspect_ratio: aspectRatio(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"], "adaptive"),
      resolution: resolution(["480p", "720p", "1080p"], "1080p"),
      duration: duration(2, 30, 5),
      generate_audio: toggle("generate_audio", "Generate Audio", true, "Generate a soundtrack with the video."),
    },
    i2v: { imageField: "image_url", lastImageField: "end_image_url", maxImages: 2 },
  }),
  videoModelPair({
    idPrefix: ID,
    slug: "minimax-h3",
    name: "MiniMax H3",
    brand: "minimax",
    description: "2K output, 5 to 15 s.",
    endpoints: {
      t2v: "minimax/h3/text-to-video",
      i2v: "minimax/h3/image-to-video",
    },
    inputs: {
      aspect_ratio: aspectRatio(["auto", "adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], "auto"),
      duration: duration(5, 15, 5),
    },
    i2v: { imageField: "image_url", lastImageField: "end_image_url", maxImages: 2 },
  }),
  videoModelPair({
    idPrefix: ID,
    slug: "hailuo-2.3",
    name: "Hailuo 2.3",
    brand: "minimax",
    description: "6 or 10 s clips.",
    endpoints: {
      t2v: "minimax/hailuo-2.3/standard/text-to-video",
      i2v: "minimax/hailuo-2.3/standard/image-to-video",
    },
    inputs: {
      duration: { ...duration(6, 10, 6), enum: [6, 10] },
      prompt_optimizer: toggle("prompt_optimizer", "Prompt Optimizer", true, "Let the model expand the prompt."),
    },
    i2v: { imageField: "image_url", maxImages: 1, ...INHERITED_RATIO },
  }),
];

export const higgsfieldCatalog = createCatalog({
  ...variantLists(IMAGE_MODELS, [["t2i", "t2iModels"], ["i2i", "i2iModels"]]),
  ...variantLists(VIDEO_MODELS, [["t2v", "t2vModels"], ["i2v", "i2vModels"]]),
  // DrawModal ("Draw to Edit") hardcodes MuAPI's Nano Banana edit models.
  aliases: {
    "nano-banana-pro-edit": "higgsfield-gpt-image-2.5-image-to-image",
    "nano-banana-2-edit": "higgsfield-grok-image-2.0-image-to-image",
  },
});
