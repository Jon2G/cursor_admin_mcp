import * as z from "zod/v4";
import type { ToolAnnotations } from "@modelcontextprotocol/server";
import type { ToolResult } from "./types.js";

export const elevatedOutputSchema = z.object({
  output: z.string().describe(
    "Captured stdout/stderr from the elevated command, or a denial/error message."
  ),
  isError: z.boolean().describe(
    "True when the command failed, timed out, was denied by the user, or the tool was called on the wrong OS."
  ),
});

export function withStructuredOutput(result: ToolResult) {
  return {
    ...result,
    structuredContent: {
      output: result.content[0]?.text ?? "",
      isError: result.isError ?? false,
    },
  };
}

export const elevatedToolAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};
