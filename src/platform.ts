export function isWindows(): boolean {
  return process.platform === "win32";
}

export function isLinux(): boolean {
  return process.platform === "linux";
}

export function assertWindows(): void {
  if (!isWindows()) {
    throw new Error(
      "run_as_admin is only supported on Windows (win32). Current platform: " +
        process.platform
    );
  }
}

export function assertLinux(): void {
  if (!isLinux()) {
    throw new Error(
      "run_as_root is only supported on Linux. Current platform: " +
        process.platform
    );
  }
}
