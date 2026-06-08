export function assertWindows(): void {
  if (process.platform !== "win32") {
    throw new Error(
      "run_as_admin is only supported on Windows (win32). Current platform: " +
        process.platform
    );
  }
}

export function isWindows(): boolean {
  return process.platform === "win32";
}
