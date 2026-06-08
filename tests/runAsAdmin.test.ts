import { describe, expect, it, vi } from "vitest";
import {
  NO_OUTPUT_MESSAGE,
  runAsAdmin,
  USER_DENIED_MESSAGE,
} from "../src/runAsAdmin.js";

describe("runAsAdmin", () => {
  it("returns error on non-Windows platforms", async () => {
    const result = await runAsAdmin("Write-Output test", {
      assertWindowsFn: () => {
        throw new Error("run_as_admin is only supported on Windows (win32). Current platform: linux");
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("only supported on Windows");
  });

  it("writes payload and wrapper files, invokes powershell, and returns output", async () => {
    const writtenFiles = new Map<string, string>();
    const files = new Set<string>(["C:\\temp\\mcp_output_test.log"]);
    const fileContents = new Map<string, string>([
      ["C:\\temp\\mcp_output_test.log", "hello from admin"],
    ]);

    const result = await runAsAdmin("Write-Output hello", {
      assertWindowsFn: () => undefined,
      randomUuidFn: () => "test",
      tempDirFn: () => "C:\\temp",
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
    expect(writtenFiles.get("C:\\temp\\mcp_payload_test.ps1")).toBe(
      "Write-Output hello"
    );
    expect(writtenFiles.get("C:\\temp\\mcp_wrapper_test.ps1")).toContain(
      "param("
    );
  });

  it("returns user denial message without error flag", async () => {
    const files = new Set<string>(["C:\\temp\\mcp_output_test.log"]);
    const fileContents = new Map<string, string>([
      ["C:\\temp\\mcp_output_test.log", USER_DENIED_MESSAGE],
    ]);

    const result = await runAsAdmin("Get-Service", {
      assertWindowsFn: () => undefined,
      randomUuidFn: () => "test",
      tempDirFn: () => "C:\\temp",
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
      assertWindowsFn: () => undefined,
      randomUuidFn: () => "test",
      tempDirFn: () => "C:\\temp",
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
      assertWindowsFn: () => undefined,
      randomUuidFn: () => "test",
      tempDirFn: () => "C:\\temp",
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
    const files = new Set<string>([
      "C:\\temp\\mcp_payload_test.ps1",
      "C:\\temp\\mcp_wrapper_test.ps1",
      "C:\\temp\\mcp_output_test.log",
      "C:\\temp\\mcp_payload_test.ps1.runner.ps1",
    ]);
    const deleted: string[] = [];

    await runAsAdmin("Write-Output test", {
      assertWindowsFn: () => undefined,
      randomUuidFn: () => "test",
      tempDirFn: () => "C:\\temp",
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

    expect(deleted).toContain("C:\\temp\\mcp_payload_test.ps1");
    expect(deleted).toContain("C:\\temp\\mcp_wrapper_test.ps1");
    expect(deleted).toContain("C:\\temp\\mcp_output_test.log");
    expect(deleted).toContain("C:\\temp\\mcp_payload_test.ps1.runner.ps1");
  });
});
