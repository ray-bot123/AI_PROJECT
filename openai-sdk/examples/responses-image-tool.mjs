import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const client = new OpenAI();

const prompt =
  process.argv.slice(2).join(" ") ||
  "Generate an image of a compact robot barista preparing matcha in a bright studio";

const response = await client.responses.create({
  model: process.env.RESPONSES_MODEL || "gpt-5.5",
  input: prompt,
  tools: [
    {
      type: "image_generation",
      size: process.env.IMAGE_SIZE || "1024x1024",
      quality: process.env.IMAGE_QUALITY || "medium"
    }
  ]
});

const imageCall = response.output?.find(
  (item) => item.type === "image_generation_call"
);

if (!imageCall?.result) {
  throw new Error("The response did not include an image_generation_call result.");
}

const outputDir = path.resolve("generated");
const outputPath = path.join(outputDir, "responses-image.png");

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, Buffer.from(imageCall.result, "base64"));

console.log(`Generated image through Responses API: ${outputPath}`);
