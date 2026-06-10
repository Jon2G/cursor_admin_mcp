import { afterEach, describe, expect, it, vi } from "vitest";
import { runAsRoot } from "../src/runAsRoot.js";

vi.mock("../src/linux/runAsRoot.js", () => ({
  runAsRoot: vi.fn(async (command: string) => ({
    content: [{ type: "text" as const, text: `linux:${command}` }],
  })),
}));

vi.mock("../src/macos/runAsRoot.js", () => ({
  runAsRoot: vi.fn(async (command: string) => ({
    content: [{ type: "text" as const, text: `macos:${command}` }],
  })),
}));

describe("runAsRoot dispatcher", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
    vi.clearAllMocks();
  });

  it("routes to Linux implementation on linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });

    const result = await runAsRoot("echo test");

    expect(result.content[0]?.text).toBe("linux:echo test");
  });

  it("routes to macOS implementation on darwin", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    const result = await runAsRoot("echo test");

    expect(result.content[0]?.text).toBe("macos:echo test");
  });

  it("returns platform error on unsupported platforms", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const result = await runAsRoot("echo test");

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "run_as_root is only supported on Linux and macOS"
    );
    expect(result.content[0]?.text).toContain("win32");
  });
});
