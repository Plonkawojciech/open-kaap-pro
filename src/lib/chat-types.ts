import { z } from 'zod';
import type { UIMessage } from 'ai';

export const messageMetadataSchema = z.object({
  model: z.string().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  error: z.boolean().optional(),
  warning: z.boolean().optional(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  errorDescription: z.string().optional(),
  attemptedText: z.string().optional(),
  errorModel: z.string().optional(),
  errorProvider: z.string().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type ChatMessage = UIMessage<MessageMetadata>;
