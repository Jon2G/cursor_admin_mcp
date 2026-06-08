import { describe, expect, it } from "vitest";
import {
  buildWrapperInvocation,
  buildWrapperScript,
} from "../src/powershellScripts.js";

describe("powershellScripts", () => {
  it("buildWrapperScript includes param block and LiteralPath usage", () => {
    const script = buildWrapperScript();

    expect(script).toContain("param(");
    expect(script).toContain("[string]$PayloadFile");
    expect(script).toContain("[string]$OutputFile");
    expect(script).toContain("Get-Content -LiteralPath $PayloadFile");
    expect(script).toContain("Set-Content -LiteralPath $OutputFile");
  });

  it("buildWrapperScript includes WPF approval and RunAs elevation", () => {
    const script = buildWrapperScript();

    expect(script).toContain("Add-Type -AssemblyName PresentationFramework");
    expect(script).toContain("[System.Windows.MessageBox]::Show");
    expect(script).toContain("Security Approval Required");
    expect(script).toContain("-Verb RunAs");
    expect(script).toContain("Execution denied by user.");
  });

  it("buildWrapperScript dot-sources payload in runner", () => {
    const script = buildWrapperScript();

    expect(script).toContain(". `$PayloadFile");
    expect(script).toContain("Out-File -LiteralPath `$OutputFile");
  });

  it("buildWrapperInvocation passes file arguments", () => {
    const invocation = buildWrapperInvocation(
      "C:\\temp\\wrapper.ps1",
      "C:\\temp\\payload.ps1",
      "C:\\temp\\output.log"
    );

    expect(invocation).toContain('-File "C:\\temp\\wrapper.ps1"');
    expect(invocation).toContain('-PayloadFile "C:\\temp\\payload.ps1"');
    expect(invocation).toContain('-OutputFile "C:\\temp\\output.log"');
  });
});
