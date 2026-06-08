import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  NO_OUTPUT_MESSAGE,
  runAsRoot,
  USER_DENIED_MESSAGE,
} from "../../src/linux/runAsRoot.js";

const TEST_TEMP_DIR = join("/tmp", "cursor_admin_mcp_test");
const TEST_ID = "test";

function tempPaths(id = TEST_ID) {
  const payloadFile = join(TEST_TEMP_DIR, `mcp_payload_${id}.sh`);
  const wrapperFile = join(TEST_TEMP_DIR, `mcp_wrapper_${id}.sh`);
  const outputFile = join(TEST_TEMP_DIR, `mcp_output_${id}.log`);
  const askpassFile = join(TEST_TEMP_DIR, `mcp_askpass_${id}.sh`);
  const runnerFile = `${payloadFile}.runner.sh`;

  return { payloadFile, wrapperFile, outputFile, askpassFile, runnerFile };
}

function baseDeps(overrides: Parameters<typeof runAsRoot>[1] = {}) {
  return {
    assertLinuxFn: () => undefined,
    randomUuidFn: () => TEST_ID,
    tempDirFn: () => TEST_TEMP_DIR,
    chmodSyncFn: vi.fn(),
    ...overrides,
  };
}

describe("runAsRoot", () => {
  it("returns error on non-Linux platforms", async () => {
    const result = await runAsRoot("echo test", {
      assertLinuxFn: () => {
        throw new Error(
          "run_as_root is only supported on Linux. Current platform: win32"
        );
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("only supported on Linux");
  });

  it("writes payload, wrapper, and askpass files, then returns output", async () => {
    const paths = tempPaths();
    const writtenFiles = new Map<string, string>();
    const files = new Set<string>([paths.outputFile]);
    const fileContents = new Map<string, string>([
      [paths.outputFile, "hello from root"],
    ]);
    const chmodSyncFn = vi.fn();

    const result = await runAsRoot('echo "hello"', {
      ...baseDeps({ chmodSyncFn }),
      writeFileSyncFn: (path: string, data: string) => {
        writtenFiles.set(String(path), String(data));
        files.add(String(path));
      },
      existsSyncFn: (path: string) => files.has(String(path)),
      readFileSyncFn: (path: string) => fileContents.get(String(path)) ?? "",
      execSyncFn: vi.fn(),
      unlinkSyncFn: (path: string) => {
        files.delete(String(path));
      },
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toBe("hello from root");
    expect(writtenFiles.get(paths.payloadFile)).toBe('echo "hello"');
    expect(writtenFiles.get(paths.wrapperFile)).toContain("zenity --question");
    expect(writtenFiles.get(paths.askpassFile)).toContain("zenity --password");
    expect(chmodSyncFn).toHaveBeenCalledWith(paths.wrapperFile, 0o700);
    expect(chmodSyncFn).toHaveBeenCalledWith(paths.askpassFile, 0o700);
  });

  it("returns user denial message without error flag", async () => {
    const paths = tempPaths();
    const files = new Set<string>([paths.outputFile]);
    const fileContents = new Map<string, string>([
      [paths.outputFile, USER_DENIED_MESSAGE],
    ]);

    const result = await runAsRoot("apt update", {
      ...baseDeps(),
      writeFileSyncFn: () => undefined,
      existsSyncFn: (path: string) => files.has(String(path)),
      readFileSyncFn: (path: string) => fileContents.get(String(path)) ?? "",
      execSyncFn: vi.fn(),
      unlinkSyncFn: () => undefined,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toBe(USER_DENIED_MESSAGE);
  });

  it("returns no-output message when log file is missing", async () => {
    const result = await runAsRoot("echo test", {
      ...baseDeps(),
      writeFileSyncFn: () => undefined,
      existsSyncFn: () => false,
      readFileSyncFn: () => "",
      execSyncFn: vi.fn(),
      unlinkSyncFn: () => undefined,
    });

    expect(result.content[0]?.text).toBe(NO_OUTPUT_MESSAGE);
  });

  it("returns timeout error when execSync is killed", async () => {
    const timeoutError = Object.assign(new Error("Timed out"), {
      killed: true,
    });

    const result = await runAsRoot("sleep 999", {
      ...baseDeps(),
      writeFileSyncFn: () => undefined,
      existsSyncFn: () => false,
      readFileSyncFn: () => "",
      execSyncFn: () => {
        throw timeoutError;
      },
      unlinkSyncFn: () => undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("timed out");
  });

  it("cleans up temp files in finally block", async () => {
    const paths = tempPaths();
    const files = new Set<string>([
      paths.payloadFile,
      paths.wrapperFile,
      paths.outputFile,
      paths.askpassFile,
      paths.runnerFile,
    ]);
    const deleted: string[] = [];

    await runAsRoot("echo test", {
      ...baseDeps(),
      writeFileSyncFn: (path: string) => {
        files.add(String(path));
      },
      existsSyncFn: (path: string) => files.has(String(path)),
      readFileSyncFn: () => "done",
      execSyncFn: vi.fn(),
      unlinkSyncFn: (path: string) => {
        deleted.push(String(path));
        files.delete(String(path));
      },
    });

    expect(deleted).toContain(paths.payloadFile);
    expect(deleted).toContain(paths.wrapperFile);
    expect(deleted).toContain(paths.outputFile);
    expect(deleted).toContain(paths.askpassFile);
    expect(deleted).toContain(paths.runnerFile);
  });
});
