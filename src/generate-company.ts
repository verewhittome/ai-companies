import Anthropic from "@anthropic-ai/sdk";
import { CompanyBriefSchema, type CompanyBrief, type ExperimentConfig } from "./types/company.js";

const SYSTEM_PROMPT = `You design synthetic companies for experiments.
Return only valid JSON matching this shape:
{
  "name": string,
  "tagline": string,
  "mission": string,
  "targetCustomer": string,
  "product": string,
  "businessModel": string,
  "differentiators": string[]
}`;

export async function generateCompany(
  client: Anthropic,
  config: ExperimentConfig,
): Promise<{ company: CompanyBrief; rawResponse: string }> {
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: config.prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text content");
  }

  const rawResponse = textBlock.text.trim();
  const jsonStart = rawResponse.indexOf("{");
  const jsonEnd = rawResponse.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Model response did not contain JSON");
  }

  const parsed = JSON.parse(rawResponse.slice(jsonStart, jsonEnd + 1));
  const company = CompanyBriefSchema.parse(parsed);

  return { company, rawResponse };
}
