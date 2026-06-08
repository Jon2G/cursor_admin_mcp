export function buildAskpassScript(): string {
  const lines = [
    "#!/usr/bin/env bash",
    "zenity --password --title=\"Administrator authentication required\" 2>/dev/null",
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
    'if ! command -v zenity >/dev/null 2>&1; then',
    '  echo "zenity is required but was not found. Install zenity and ensure DISPLAY is set." >&2',
    "  exit 1",
    "fi",
    "",
    'if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then',
    '  echo "DISPLAY or WAYLAND_DISPLAY must be set for approval dialogs." >&2',
    "  exit 1",
    "fi",
    "",
    'RAW_COMMAND="$(cat "$PAYLOAD_FILE")"',
    'MSG="Cursor wants to execute the following command with root privileges:\n\n${RAW_COMMAND}\n\nDo you approve?"',
    "",
    'if zenity --question --title="Security Approval Required" --text="$MSG" --no-wrap; then',
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
