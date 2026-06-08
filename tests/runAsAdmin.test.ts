import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  NO_OUTPUT_MESSAGE,
  runAsAdmin,
  USER_DENIED_MESSAGE,
} from "../src/runAsAdmin.js";

const TEST_TEMP_DIR = join("/tmp", "cursor_admin_mcp_test");
const TEST_ID = "test";

function tempPaths(id = TEST_ID) {
  const payloadFile = join(TEST_TEMP_DIR, `mcp_payload_${id}.ps1`);
  const wrapperFile = join(TEST_TEMP_DIR, `mcp_wrapper_${id}.ps1`);
  const outputFile = join(TEST_TEMP_DIR, `mcp_output_${id}.log`);
  const runnerFile = `${payloadFile}.runner.ps1`;

  return { payloadFile, wrapperFile, outputFile, runnerFile };
}

function baseDeps(overrides: Parameters<typeof runAsAdmin>[1] = {}) {
  return {
    assertWindowsFn: () => undefined,
    randomUuidFn: () => TEST_ID,
    tempDirFn: () => TEST_TEMP_DIR,
    ...overrides,
  };
}

describe("runAsAdmin", () => {
  it("returns error on non-Windows platforms", async () => {
    const result = await runAsAdmin("Write-Output test", {
      assertWindowsFn: () => {
        throw new Error(
          "run_as_admin is only supported on Windows (win32). Current platform: linux"
        );
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("only supported on Windows");
  });

  it("writes payload and wrapper files, invokes powershell, and returns output", async () => {
    const paths = tempPaths();
    const writtenFiles = new Map<string, string>();
    const files = new Set<string>([paths.outputFile]);
    const fileContents = new Map<string, string>([
      [paths.outputFile, "hello from admin"],
    ]);

    const result = await runAsAdmin("Write-Output hello", {
      ...baseDeps(),
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
    expect(result.content[0]?.text).toBe("hello from admin");
    expect(writtenFiles.get(paths.payloadFile)).toBe("Write-Output hello");
    expect(writtenFiles.get(paths.wrapperFile)).toContain("param(");
  });

  it("returns user denial message without error flag", async () => {
    const paths = tempPaths();
    const files = new Set<string>([paths.outputFile]);
    const fileContents = new Map<string, string>([
      [paths.outputFile, USER_DENIED_MESSAGE],
    ]);

    const result = await runAsAdmin("Get-Service", {
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
    const result = await runAsAdmin("Write-Output test", {
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

    const result = await runAsAdmin("Start-Sleep 999", {
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
      paths.runnerFile,
    ]);
    const deleted: string[] = [];

    await runAsAdmin("Write-Output test", {
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
    expect(deleted).toContain(paths.runnerFile);
  });
});
