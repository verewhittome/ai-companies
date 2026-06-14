import { z } from "zod";

export const CompanyBriefSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  mission: z.string(),
  targetCustomer: z.string(),
  product: z.string(),
  businessModel: z.string(),
  differentiators: z.array(z.string()),
});

export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;

export const ExperimentConfigSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  model: z.string().default("claude-sonnet-4-6"),
  outputDir: z.string().optional(),
});

export type ExperimentConfig = z.infer<typeof ExperimentConfigSchema>;

export type ExperimentResult = {
  config: ExperimentConfig;
  company: CompanyBrief;
  rawResponse: string;
  createdAt: string;
};
