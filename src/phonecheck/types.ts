import { z } from "zod";

export const ValidateRequestSchema = z.object({
  phone: z.string().min(1).max(40),
  /** ISO 3166-1 alpha-2 country to parse national-format numbers, e.g. "GB". */
  country: z.string().length(2).optional(),
});
export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;

export const BatchValidateRequestSchema = z.object({
  phones: z.array(z.string().min(1).max(40)).min(1).max(100),
  country: z.string().length(2).optional(),
});
export type BatchValidateRequest = z.infer<typeof BatchValidateRequestSchema>;
