export function buildAskpassScript(): string {
  const lines = [
    "#!/usr/bin/env bash",
    'osascript -e \'text returned of (display dialog "Administrator password required for Cursor:" default answer "" with hidden answer with icon caution)\' 2>/dev/null',
  ];

  return lines.join("\n");
}

export function buildWrapperScript(): string {
  const lines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    'PAYLOAD_FILE="${1:?Payload file required}"',
    'OUTPUT_FILE="${2:?Output file required}"',
    'ASKPASS_FILE="${3:?Askpass file required}"',
    "",
    'if ! command -v osascript >/dev/null 2>&1; then',
    '  echo "osascript is required but was not found." >&2',
    "  exit 1",
    "fi",
    "",
    'RAW_COMMAND="$(cat "$PAYLOAD_FILE")"',
    "",
    'BUTTON="$(osascript - "$RAW_COMMAND" <<\'APPLESCRIPT\'',
    "on run argv",
    "  set rawCommand to item 1 of argv",
    '  set msg to "Cursor wants to execute the following command with root privileges:" & return & return & rawCommand & return & return & "Do you approve?"',
    '  display dialog msg buttons {"No", "Yes"} default button "Yes" with title "Security Approval Required" with icon caution',
    "  return button returned of result",
    "end run",
    "APPLESCRIPT",
    ')"',
    "",
    'if [ "$BUTTON" = "Yes" ]; then',
    '  RUNNER_FILE="${PAYLOAD_FILE}.runner.sh"',
    '  cat > "$RUNNER_FILE" <<EOF',
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'PAYLOAD_FILE="$1"',
    'OUTPUT_FILE="$2"',
    'source "$PAYLOAD_FILE" &> "$OUTPUT_FILE"',
    "EOF",
    '  chmod 700 "$RUNNER_FILE"',
    '  export SUDO_ASKPASS="$ASKPASS_FILE"',
    '  sudo -A bash "$RUNNER_FILE" "$PAYLOAD_FILE" "$OUTPUT_FILE"',
    '  rm -f "$RUNNER_FILE"',
    "else",
    '  printf "%s" "Execution denied by user." > "$OUTPUT_FILE"',
    "fi",
  ];

  return lines.join("\n");
}

export function buildWrapperInvocation(
  wrapperFile: string,
  payloadFile: string,
  outputFile: string,
  askpassFile: string
): string {
  return `bash "${wrapperFile}" "${payloadFile}" "${outputFile}" "${askpassFile}"`;
}
