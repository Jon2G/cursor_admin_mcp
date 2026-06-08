import { assertWindows } from "./platform.js";
import { executeWithApproval, type ToolResult } from "./executionFlow.js";
import {
  DEFAULT_TIMEOUT_MS,
  NO_OUTPUT_MESSAGE,
  USER_DENIED_MESSAGE,
  type ExecutionDeps,
} from "./types.js";
import {
  buildWrapperInvocation,
  buildWrapperScript,
} from "./windows/powershellScripts.js";

export { DEFAULT_TIMEOUT_MS, NO_OUTPUT_MESSAGE, USER_DENIED_MESSAGE, type ToolResult };

export type RunAsAdminDeps = Partial<
  ExecutionDeps & {
    assertWindowsFn: () => void;
  }
>;

export async function runAsAdmin(
  command: string,
  deps: RunAsAdminDeps = {}
): Promise<ToolResult> {
  const { assertWindowsFn, ...executionDeps } = deps;

  return executeWithApproval(
    command,
    {
      assertPlatformFn: assertWindowsFn ?? assertWindows,
      payloadExtension: "ps1",
      runnerExtension: ".runner.ps1",
      prepareExecution: ({ paths }) => ({
        auxiliaryFiles: [
          { path: paths.wrapperFile, content: buildWrapperScript() },
        ],
        invocation: buildWrapperInvocation(
          paths.wrapperFile,
          paths.payloadFile,
          paths.outputFile
        ),
      }),
    },
    {
      ...executionDeps,
      assertPlatformFn: assertWindowsFn ?? assertWindows,
    }
  );
}
