import { afterEach, describe, expect, it } from "vitest";
import {
  assertLinux,
  assertMacOS,
  assertWindows,
  isLinux,
  isMacOS,
  isWindows,
} from "../src/platform.js";

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

  it("isLinux returns true on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(isLinux()).toBe(true);
  });

  it("isLinux returns false on non-linux", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(isLinux()).toBe(false);
  });

  it("assertLinux throws on non-linux", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(() => assertLinux()).toThrow(
      "run_as_root is only supported on Linux. Current platform: win32"
    );
  });

  it("assertLinux does not throw on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(() => assertLinux()).not.toThrow();
  });

  it("isMacOS returns true on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    expect(isMacOS()).toBe(true);
  });

  it("isMacOS returns false on non-darwin", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(isMacOS()).toBe(false);
  });

  it("assertMacOS throws on non-darwin", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(() => assertMacOS()).toThrow(
      "run_as_root is only supported on macOS (darwin). Current platform: linux"
    );
  });

  it("assertMacOS does not throw on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    expect(() => assertMacOS()).not.toThrow();
  });
});
