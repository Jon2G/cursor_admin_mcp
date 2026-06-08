import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_TIMEOUT_MS,
  NO_OUTPUT_MESSAGE,
  USER_DENIED_MESSAGE,
  type ExecutionDeps,
  type ExecutionPaths,
  type PrepareExecutionFn,
  type ToolResult,
} from "./types.js";

const defaultDeps: ExecutionDeps = {
  assertPlatformFn: () => undefined,
  writeFileSyncFn: writeFileSync,
  readFileSyncFn: readFileSync,
  existsSyncFn: existsSync,
  unlinkSyncFn: unlinkSync,
  chmodSyncFn: chmodSync,
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

function cleanupFiles(deps: ExecutionDeps, ...filePaths: string[]): void {
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

export function formatExecutionError(error: unknown): ToolResult {
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

export type ExecuteWithApprovalConfig = {
  assertPlatformFn: () => void;
  payloadExtension: string;
  runnerExtension: string;
  prepareExecution: PrepareExecutionFn;
};

export function buildExecutionPaths(
  tempDir: string,
  uniqueId: string,
  payloadExtension: string,
  runnerExtension: string,
  askpassExtension?: string
): ExecutionPaths {
  const payloadFile = join(tempDir, `mcp_payload_${uniqueId}.${payloadExtension}`);
  const wrapperFile = join(tempDir, `mcp_wrapper_${uniqueId}.${payloadExtension}`);
  const outputFile = join(tempDir, `mcp_output_${uniqueId}.log`);
  const runnerFile = `${payloadFile}${runnerExtension}`;
  const paths: ExecutionPaths = { payloadFile, wrapperFile, outputFile, runnerFile };

  if (askpassExtension) {
    paths.askpassFile = join(tempDir, `mcp_askpass_${uniqueId}.${askpassExtension}`);
  }

  return paths;
}

export async function executeWithApproval(
  command: string,
  config: ExecuteWithApprovalConfig,
  deps: Partial<ExecutionDeps> = {}
): Promise<ToolResult> {
  const resolvedDeps: ExecutionDeps = {
    ...defaultDeps,
    assertPlatformFn: config.assertPlatformFn,
    ...deps,
  };

  try {
    resolvedDeps.assertPlatformFn();
  } catch (error) {
    return formatExecutionError(error);
  }

  const uniqueId = resolvedDeps.randomUuidFn();
  const tempDir = resolvedDeps.tempDirFn();
  const paths = buildExecutionPaths(
    tempDir,
    uniqueId,
    config.payloadExtension,
    config.runnerExtension,
    config.payloadExtension === "sh" ? "sh" : undefined
  );

  let cleanupPaths: string[] = [];

  try {
    const prepared = config.prepareExecution({
      command,
      paths,
      deps: resolvedDeps,
    });

    cleanupPaths = [
      paths.payloadFile,
      paths.wrapperFile,
      paths.outputFile,
      paths.runnerFile,
      ...(paths.askpassFile ? [paths.askpassFile] : []),
      ...(prepared.extraCleanupPaths ?? []),
    ];

    resolvedDeps.writeFileSyncFn(paths.payloadFile, command, "utf8");

    for (const file of prepared.auxiliaryFiles) {
      resolvedDeps.writeFileSyncFn(file.path, file.content, "utf8");
    }

    for (const filePath of prepared.chmodPaths ?? []) {
      resolvedDeps.chmodSyncFn(filePath, 0o700);
    }

    resolvedDeps.execSyncFn(prepared.invocation, {
      timeout: resolvedDeps.timeoutMs,
      windowsHide: false,
    });

    if (!resolvedDeps.existsSyncFn(paths.outputFile)) {
      return {
        content: [{ type: "text", text: NO_OUTPUT_MESSAGE }],
      };
    }

    const result = resolvedDeps.readFileSyncFn(paths.outputFile, "utf8");

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
    cleanupFiles(resolvedDeps, ...cleanupPaths);
  }
}

export {
  DEFAULT_TIMEOUT_MS,
  NO_OUTPUT_MESSAGE,
  USER_DENIED_MESSAGE,
  type ToolResult,
};
