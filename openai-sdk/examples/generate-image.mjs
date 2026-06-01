import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const client = new OpenAI();

const prompt =
  process.argv.slice(2).join(" ") ||
  "A clean product-style illustration of a tiny glass greenhouse on a desk, morning light, high detail";

const model = process.env.IMAGE_MODEL || "gpt-image-2";
const size = process.env.IMAGE_SIZE || "1024x1024";
const quality = process.env.IMAGE_QUALITY || "medium";

const result = await client.images.generate({
  model,
  prompt,
  size,
  quality,
  n: 1
});

const imageBase64 = result.data?.[0]?.b64_json;

if (!imageBase64) {
  throw new Error("The image generation response did not include b64_json data.");
}

const outputDir = path.resolve("generated");
const outputPath = path.join(outputDir, "image.png");

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, Buffer.from(imageBase64, "base64"));

console.log(`Generated image with ${model}: ${outputPath}`);
