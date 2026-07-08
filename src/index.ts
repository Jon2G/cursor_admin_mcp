import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { runAsRoot } from "./runAsRoot.js";
import { runAsAdmin } from "./runAsAdmin.js";
import {
  elevatedOutputSchema,
  elevatedToolAnnotations,
  withStructuredOutput,
} from "./toolDefinitions.js";

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
    title: "Run PowerShell as Administrator",
    description:
      "Runs a PowerShell command with Windows Administrator privileges after the user approves a WPF dialog and UAC. Use on Windows when admin rights are required; use run_as_root on Linux/macOS instead.",
    inputSchema: z.object({
      command: z
        .string()
        .describe(
          "Valid PowerShell to run elevated after user approval (e.g. 'Get-Service spooler'). Not cmd.exe or bash."
        ),
    }),
    outputSchema: elevatedOutputSchema,
    annotations: {
      ...elevatedToolAnnotations,
      title: "Run PowerShell as Administrator",
    },
  },
  async ({ command }) => withStructuredOutput(await runAsAdmin(command))
);

server.registerTool(
  "run_as_root",
  {
    title: "Run bash as root",
    description:
      "Runs a bash command as root on Linux or macOS after the user approves a zenity/osascript dialog and sudo authentication. Use on Linux/macOS when root is required; use run_as_admin on Windows instead.",
    inputSchema: z.object({
      command: z
        .string()
        .describe(
          "Valid bash to run as root after user approval (e.g. 'systemctl status nginx'). Use run_as_admin for PowerShell on Windows."
        ),
    }),
    outputSchema: elevatedOutputSchema,
    annotations: {
      ...elevatedToolAnnotations,
      title: "Run bash as root",
    },
  },
  async ({ command }) => withStructuredOutput(await runAsRoot(command))
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
