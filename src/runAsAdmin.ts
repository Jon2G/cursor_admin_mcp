import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertWindows } from "./platform.js";
import {
  buildWrapperInvocation,
  buildWrapperScript,
} from "./powershellScripts.js";

export const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export const USER_DENIED_MESSAGE = "Execution denied by user.";
export const NO_OUTPUT_MESSAGE =
  "Execution finished, but no output was logged.";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type RunAsAdminDeps = {
  assertWindowsFn: () => void;
  writeFileSyncFn: typeof writeFileSync;
  readFileSyncFn: typeof readFileSync;
  existsSyncFn: typeof existsSync;
  unlinkSyncFn: typeof unlinkSync;
  execSyncFn: typeof execSync;
  randomUuidFn: () => string;
  tempDirFn: () => string;
  timeoutMs: number;
};

const defaultDeps: RunAsAdminDeps = {
  assertWindowsFn: assertWindows,
  writeFileSyncFn: writeFileSync,
  readFileSyncFn: readFileSync,
  existsSyncFn: existsSync,
  unlinkSyncFn: unlinkSync,
  execSyncFn: execSync,
  randomUuidFn: randomUUID,
  tempDirFn: tmpdir,
  timeoutMs: DEFAULT_TIMEOUT_MS,
};

function cleanupFile(
  unlinkSyncFn: typeof unlinkSync,
  existsSyncFn: typeof existsSync,
  filePath: string
): void {
  if (existsSyncFn(filePath)) {
    unlinkSyncFn(filePath);
  }
}

function cleanupFiles(
  deps: RunAsAdminDeps,
  ...filePaths: string[]
): void {
  for (const filePath of filePaths) {
    cleanupFile(deps.unlinkSyncFn, deps.existsSyncFn, filePath);
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "killed" in error &&
    (error as { killed?: boolean }).killed === true
  );
}

function formatExecutionError(error: unknown): ToolResult {
  if (isTimeoutError(error)) {
    return {
      content: [
        {
          type: "text",
          text: "Tool execution timed out waiting for user approval or elevated command completion.",
        },
      ],
      isError: true,
    };
  }

  const message =
    error instanceof Error ? error.message : "Unknown execution error";

  return {
    content: [{ type: "text", text: `Tool execution failed: ${message}` }],
    isError: true,
  };
}

export async function runAsAdmin(
  command: string,
  deps: Partial<RunAsAdminDeps> = {}
): Promise<ToolResult> {
  const resolvedDeps: RunAsAdminDeps = { ...defaultDeps, ...deps };

  try {
    resolvedDeps.assertWindowsFn();
  } catch (error) {
    return formatExecutionError(error);
  }

  const uniqueId = resolvedDeps.randomUuidFn();
  const tempDir = resolvedDeps.tempDirFn();

  const payloadFile = join(tempDir, `mcp_payload_${uniqueId}.ps1`);
  const wrapperFile = join(tempDir, `mcp_wrapper_${uniqueId}.ps1`);
  const outputFile = join(tempDir, `mcp_output_${uniqueId}.log`);
  const runnerFile = `${payloadFile}.runner.ps1`;

  try {
    resolvedDeps.writeFileSyncFn(payloadFile, command, "utf8");
    resolvedDeps.writeFileSyncFn(
      wrapperFile,
      buildWrapperScript(),
      "utf8"
    );

    const invocation = buildWrapperInvocation(
      wrapperFile,
      payloadFile,
      outputFile
    );

    resolvedDeps.execSyncFn(invocation, {
      timeout: resolvedDeps.timeoutMs,
      windowsHide: false,
    });

    if (!resolvedDeps.existsSyncFn(outputFile)) {
      return {
        content: [{ type: "text", text: NO_OUTPUT_MESSAGE }],
      };
    }

    const result = resolvedDeps.readFileSyncFn(outputFile, "utf8");

    if (result.trim() === USER_DENIED_MESSAGE) {
      return {
        content: [{ type: "text", text: USER_DENIED_MESSAGE }],
      };
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return formatExecutionError(error);
  } finally {
    cleanupFiles(
      resolvedDeps,
      payloadFile,
      wrapperFile,
      outputFile,
      runnerFile
    );
  }
}
