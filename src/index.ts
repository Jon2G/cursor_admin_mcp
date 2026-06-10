import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { runAsRoot } from "./runAsRoot.js";
import { runAsAdmin } from "./runAsAdmin.js";

const server = new McpServer(
  { name: "secure-admin-mcp", version: "1.2.0" },
  {
    instructions:
      "Cross-platform elevated execution with mandatory user approval. On Windows use run_as_admin (PowerShell + UAC). On Linux and macOS use run_as_root (bash + sudo). Never assume approval.",
  }
);

server.registerTool(
  "run_as_admin",
  {
    description:
      "Windows only. Executes a PowerShell command with Administrator privileges after visual user approval.",
    inputSchema: z.object({
      command: z.string().describe("PowerShell command or script to execute."),
    }),
  },
  async ({ command }) => runAsAdmin(command)
);

server.registerTool(
  "run_as_root",
  {
    description:
      "Linux and macOS. Executes a bash command as root after visual user approval and sudo authentication.",
    inputSchema: z.object({
      command: z.string().describe("Bash command or script to execute as root."),
    }),
  },
  async ({ command }) => runAsRoot(command)
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
