import { assertMacOS } from "../platform.js";
import { executeWithApproval, type ToolResult } from "../executionFlow.js";
import {
  DEFAULT_TIMEOUT_MS,
  NO_OUTPUT_MESSAGE,
  USER_DENIED_MESSAGE,
  type ExecutionDeps,
} from "../types.js";
import {
  buildAskpassScript,
  buildWrapperInvocation,
  buildWrapperScript,
} from "./shellScripts.js";

export { DEFAULT_TIMEOUT_MS, NO_OUTPUT_MESSAGE, USER_DENIED_MESSAGE, type ToolResult };

export type RunAsRootDeps = Partial<
  ExecutionDeps & {
    assertMacOSFn: () => void;
  }
>;

export async function runAsRoot(
  command: string,
  deps: RunAsRootDeps = {}
): Promise<ToolResult> {
  const { assertMacOSFn, ...executionDeps } = deps;

  return executeWithApproval(
    command,
    {
      assertPlatformFn: assertMacOSFn ?? assertMacOS,
      payloadExtension: "sh",
      runnerExtension: ".runner.sh",
      prepareExecution: ({ paths }) => {
        if (!paths.askpassFile) {
          throw new Error("Askpass file path is required for macOS execution.");
        }

        const scriptPaths = [paths.wrapperFile, paths.askpassFile];

        return {
          auxiliaryFiles: [
            { path: paths.wrapperFile, content: buildWrapperScript() },
            { path: paths.askpassFile, content: buildAskpassScript() },
          ],
          invocation: buildWrapperInvocation(
            paths.wrapperFile,
            paths.payloadFile,
            paths.outputFile,
            paths.askpassFile
          ),
          chmodPaths: scriptPaths,
        };
      },
    },
    {
      ...executionDeps,
      assertPlatformFn: assertMacOSFn ?? assertMacOS,
    }
  );
}
