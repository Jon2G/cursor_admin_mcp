import { describe, expect, it } from "vitest";
import {
  buildAskpassScript,
  buildWrapperInvocation,
  buildWrapperScript,
} from "../../src/macos/shellScripts.js";

describe("shellScripts", () => {
  it("buildAskpassScript uses osascript password prompt", () => {
    const script = buildAskpassScript();

    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain("osascript");
    expect(script).toContain("hidden answer");
  });

  it("buildWrapperScript includes positional args and osascript approval", () => {
    const script = buildWrapperScript();

    expect(script).toContain('PAYLOAD_FILE="${1:?Payload file required}"');
    expect(script).toContain('OUTPUT_FILE="${2:?Output file required}"');
    expect(script).toContain('ASKPASS_FILE="${3:?Askpass file required}"');
    expect(script).toContain("osascript");
    expect(script).toContain("Security Approval Required");
    expect(script).toContain('RAW_COMMAND="$(cat "$PAYLOAD_FILE")"');
  });

  it("buildWrapperScript includes sudo askpass elevation and denial branch", () => {
    const script = buildWrapperScript();

    expect(script).toContain('export SUDO_ASKPASS="$ASKPASS_FILE"');
    expect(script).toContain("sudo -A bash");
    expect(script).toContain('source "$PAYLOAD_FILE"');
    expect(script).toContain("Execution denied by user.");
  });

  it("buildWrapperScript checks for osascript", () => {
    const script = buildWrapperScript();

    expect(script).toContain("command -v osascript");
  });

  it("buildWrapperScript passes command via osascript argv", () => {
    const script = buildWrapperScript();

    expect(script).toContain('osascript - "$RAW_COMMAND"');
    expect(script).toContain("on run argv");
    expect(script).toContain("set rawCommand to item 1 of argv");
  });

  it("buildWrapperInvocation passes file arguments", () => {
    const invocation = buildWrapperInvocation(
      "/tmp/wrapper.sh",
      "/tmp/payload.sh",
      "/tmp/output.log",
      "/tmp/askpass.sh"
    );

    expect(invocation).toContain('bash "/tmp/wrapper.sh"');
    expect(invocation).toContain('"/tmp/payload.sh"');
    expect(invocation).toContain('"/tmp/output.log"');
    expect(invocation).toContain('"/tmp/askpass.sh"');
  });
});
