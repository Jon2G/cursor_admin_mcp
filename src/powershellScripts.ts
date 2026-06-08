export function buildWrapperScript(): string {
  const lines = [
    "param(",
    "    [Parameter(Mandatory = $true)]",
    "    [string]$PayloadFile,",
    "",
    "    [Parameter(Mandatory = $true)]",
    "    [string]$OutputFile",
    ")",
    "",
    "Add-Type -AssemblyName PresentationFramework",
    "",
    "$rawCommand = Get-Content -LiteralPath $PayloadFile -Raw",
    '$msg = "Cursor wants to execute the following command with Administrator privileges:`n`n$rawCommand`n`nDo you approve?"',
    "",
    '$result = [System.Windows.MessageBox]::Show($msg, "Security Approval Required", "YesNo", "Warning")',
    "",
    "if ($result -eq 'Yes') {",
    '    $runnerFile = "$PayloadFile.runner.ps1"',
    '    $runnerContent = "param([string]`$PayloadFile, [string]`$OutputFile)`n. `$PayloadFile 2>&1 | Out-File -LiteralPath `$OutputFile -Encoding utf8"',
    "    Set-Content -LiteralPath $runnerFile -Value $runnerContent -Encoding utf8",
    "",
    '    Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", $runnerFile, "-PayloadFile", $PayloadFile, "-OutputFile", $OutputFile -Verb RunAs -Wait',
    "    Remove-Item -LiteralPath $runnerFile -ErrorAction SilentlyContinue",
    "} else {",
    '    Set-Content -LiteralPath $OutputFile -Value "Execution denied by user." -Encoding utf8',
    "}",
  ];

  return lines.join("\n");
}

export function buildWrapperInvocation(
  wrapperFile: string,
  payloadFile: string,
  outputFile: string
): string {
  return `powershell -NoProfile -ExecutionPolicy Bypass -File "${wrapperFile}" -PayloadFile "${payloadFile}" -OutputFile "${outputFile}"`;
}
