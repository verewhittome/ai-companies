import { z } from "zod";

export const ValidateRequestSchema = z.object({
  email: z.string().min(1).max(320),
  /** Skip the DNS/MX lookup for a faster syntax-only check. */
  skipMx: z.boolean().optional(),
});
export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;

export const BatchValidateRequestSchema = z.object({
  emails: z.array(z.string().min(1).max(320)).min(1).max(100),
  skipMx: z.boolean().optional(),
});
export type BatchValidateRequest = z.infer<typeof BatchValidateRequestSchema>;

export interface ValidateResult {
  email: string;
  normalized: string;
  valid_syntax: boolean;
  local_part: string | null;
  domain: string | null;
  is_free: boolean;
  is_role: boolean;
  is_disposable: boolean;
  has_mx: boolean | null;
  mx_count: number;
  domain_resolves: boolean | null;
  did_you_mean: string | null;
  deliverable: boolean;
  score: number;
}
