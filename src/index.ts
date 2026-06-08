import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { runAsAdmin } from "./runAsAdmin.js";

const server = new McpServer(
  { name: "windows-secure-admin-mcp", version: "1.0.0" },
  {
    instructions:
      "Windows-only. run_as_admin always shows a native approval dialog before UAC elevation. Never assume approval.",
  }
);

server.registerTool(
  "run_as_admin",
  {
    description:
      "Executes a PowerShell command with Administrator privileges after visual user approval.",
    inputSchema: z.object({
      command: z.string().describe("PowerShell command or script to execute."),
    }),
  },
  async ({ command }) => runAsAdmin(command)
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
