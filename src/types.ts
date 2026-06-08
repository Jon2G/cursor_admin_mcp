import type { execSync } from "node:child_process";
import type { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

export const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export const USER_DENIED_MESSAGE = "Execution denied by user.";
export const NO_OUTPUT_MESSAGE =
  "Execution finished, but no output was logged.";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ExecutionDeps = {
  assertPlatformFn: () => void;
  writeFileSyncFn: typeof writeFileSync;
  readFileSyncFn: typeof readFileSync;
  existsSyncFn: typeof existsSync;
  unlinkSyncFn: typeof unlinkSync;
  chmodSyncFn: typeof chmodSync;
  execSyncFn: typeof execSync;
  randomUuidFn: () => string;
  tempDirFn: () => string;
  timeoutMs: number;
};

export type ExecutionPaths = {
  payloadFile: string;
  wrapperFile: string;
  outputFile: string;
  runnerFile: string;
  askpassFile?: string;
};

export type PrepareExecutionResult = {
  auxiliaryFiles: Array<{ path: string; content: string }>;
  invocation: string;
  extraCleanupPaths?: string[];
  chmodPaths?: string[];
};

export type PrepareExecutionFn = (context: {
  command: string;
  paths: ExecutionPaths;
  deps: ExecutionDeps;
}) => PrepareExecutionResult;
