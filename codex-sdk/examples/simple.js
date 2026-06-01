import { Codex } from "@openai/codex-sdk";

const prompt =
  process.argv.slice(2).join(" ") ||
  "Inspect this folder and suggest one practical next step for turning it into a useful SDK demo.";

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  skipGitRepoCheck: true,
});

const turn = await thread.run(prompt);

console.log("\nFinal response:\n");
console.log(turn.finalResponse);

if (turn.items?.length) {
  console.log("\nItems:");
  for (const item of turn.items) {
    console.log(`- ${item.type}`);
  }
}

