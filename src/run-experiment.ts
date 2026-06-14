import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { generateCompany } from "./generate-company.js";
import { ExperimentConfigSchema } from "./types/company.js";

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, true);
      continue;
    }

    args.set(key, next);
    i++;
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.get("help")) {
    console.log(`Usage: npm run experiment -- [options]

Options:
  --id <id>        Experiment id (default: timestamp slug)
  --prompt <text>  Company generation prompt
  --model <model>  Anthropic model (default: claude-sonnet-4-6)
  --help           Show this help
`);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required. Copy .env.example to .env and add your key.");
  }

  const id =
    (typeof args.get("id") === "string" ? args.get("id") : undefined) ??
    new Date().toISOString().replace(/[:.]/g, "-");

  const prompt =
    (typeof args.get("prompt") === "string" ? args.get("prompt") : undefined) ??
    "Create a B2B SaaS company that helps small dental practices automate insurance verification.";

  const model =
    (typeof args.get("model") === "string" ? args.get("model") : undefined) ??
    "claude-sonnet-4-6";

  const config = ExperimentConfigSchema.parse({ id, prompt, model });
  const client = new Anthropic({ apiKey });
  const { company, rawResponse } = await generateCompany(client, config);

  const outputDir = join("data", "experiments", config.id);
  await mkdir(outputDir, { recursive: true });

  const result = {
    config,
    company,
    rawResponse,
    createdAt: new Date().toISOString(),
  };

  const outputPath = join(outputDir, "result.json");
  await writeFile(outputPath, JSON.stringify(result, null, 2));

  console.log(`Generated company: ${company.name}`);
  console.log(`Tagline: ${company.tagline}`);
  console.log(`Saved to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
