import { afterEach, describe, expect, it } from "vitest";
import { assertWindows, isWindows } from "../src/platform.js";

describe("platform", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it("isWindows returns true on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(isWindows()).toBe(true);
  });

  it("isWindows returns false on non-win32", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(isWindows()).toBe(false);
  });

  it("assertWindows throws on non-win32", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(() => assertWindows()).toThrow(
      "run_as_admin is only supported on Windows (win32). Current platform: linux"
    );
  });

  it("assertWindows does not throw on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(() => assertWindows()).not.toThrow();
  });
});
