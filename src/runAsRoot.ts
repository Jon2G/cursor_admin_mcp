import { runAsRoot as runAsRootLinux } from "./linux/runAsRoot.js";
import { runAsRoot as runAsRootMac } from "./macos/runAsRoot.js";
import { formatExecutionError } from "./executionFlow.js";
import { isLinux, isMacOS } from "./platform.js";
import {
  DEFAULT_TIMEOUT_MS,
  NO_OUTPUT_MESSAGE,
  USER_DENIED_MESSAGE,
  type ExecutionDeps,
  type ToolResult,
} from "./types.js";

export { DEFAULT_TIMEOUT_MS, NO_OUTPUT_MESSAGE, USER_DENIED_MESSAGE, type ToolResult };

export type RunAsRootDeps = Partial<
  ExecutionDeps & {
    assertLinuxFn: () => void;
    assertMacOSFn: () => void;
  }
>;

export async function runAsRoot(
  command: string,
  deps: RunAsRootDeps = {}
): Promise<ToolResult> {
  if (isLinux()) {
    return runAsRootLinux(command, deps);
  }

  if (isMacOS()) {
    return runAsRootMac(command, deps);
  }

  return formatExecutionError(
    new Error(
      "run_as_root is only supported on Linux and macOS. Current platform: " +
        process.platform
    )
  );
}
