import { Codex } from "@openai/codex-sdk";

const prompt =
  process.argv.slice(2).join(" ") ||
  "List the files in this folder and explain what each example does.";

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  skipGitRepoCheck: true,
});

const { events } = await thread.runStreamed(prompt);

for await (const event of events) {
  switch (event.type) {
    case "item.completed":
      console.log("\n[item.completed]");
      console.log(JSON.stringify(event.item, null, 2));
      break;

    case "turn.completed":
      console.log("\n[turn.completed]");
      if (event.usage) {
        console.log("Usage:", event.usage);
      }
      break;

    case "turn.failed":
      console.error("\n[turn.failed]");
      console.error(event.error);
      process.exitCode = 1;
      break;

    default:
      if (event.type.includes("delta")) {
        process.stdout.write(".");
      } else {
        console.log(`[${event.type}]`);
      }
  }
}

