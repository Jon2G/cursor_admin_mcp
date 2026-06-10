# cursor_admin_mcp

Cross-platform secure MCP server for Cursor agents. Exposes elevated execution tools with mandatory human approval before privilege escalation:

- **Windows:** `run_as_admin` — PowerShell with WPF approval dialog and UAC
- **Linux / macOS:** `run_as_root` — bash with approval dialog and `sudo`

## Requirements

### All platforms

- Node.js 20 or later

### Windows (`run_as_admin`)

- Windows 10 or later
- Windows PowerShell 5.1 (default `powershell` on Windows)
- WPF (`PresentationFramework`) for the approval dialog

### Linux (`run_as_root`)

- bash
- `sudo` (user must have sudo privileges)
- `zenity` for approval and password dialogs
- `DISPLAY` or `WAYLAND_DISPLAY` set (GUI session required)

Install example (Debian/Ubuntu):

```bash
sudo apt install zenity
```

### macOS (`run_as_root`)

- bash
- `sudo` (user must be an administrator)
- `osascript` for approval and password dialogs (built into macOS)
- GUI session required (osascript dialogs)

## Security model

Both tools follow the same pattern: payload isolation, visual approval, privilege escalation, log capture, cleanup.

### Windows — `run_as_admin`

1. The agent sends a PowerShell command string.
2. The server writes the command to an isolated temporary `.ps1` file.
3. A wrapper script shows a WPF `MessageBox` with the **exact** command payload.
4. If the user clicks **Yes**, UAC prompts for elevation and the payload runs elevated.
5. If the user clicks **No**, execution stops and the tool returns `Execution denied by user.`
6. stdout/stderr are captured to a temporary log file and returned to the agent.
7. All temporary files are deleted after each invocation.

### Linux — `run_as_root`

1. The agent sends a bash command string.
2. The server writes the command to an isolated temporary `.sh` file.
3. A wrapper script shows a **zenity** question dialog with the **exact** command payload.
4. If the user clicks **Yes**, `sudo -A` runs the payload using a temporary `SUDO_ASKPASS` script (`zenity --password`).
5. If the user clicks **No**, execution stops and the tool returns `Execution denied by user.`
6. stdout/stderr are captured to a temporary log file and returned to the agent.
7. All temporary files are deleted after each invocation.

### macOS — `run_as_root`

1. The agent sends a bash command string.
2. The server writes the command to an isolated temporary `.sh` file.
3. A wrapper script shows an **osascript** dialog with the **exact** command payload.
4. If the user clicks **Yes**, `sudo -A` runs the payload using a temporary `SUDO_ASKPASS` script (osascript hidden-password dialog).
5. If the user clicks **No**, execution stops and the tool returns `Execution denied by user.`
6. stdout/stderr are captured to a temporary log file and returned to the agent.
7. All temporary files are deleted after each invocation.

The agent cannot bypass approval or elevation on any platform. Use the tool that matches the current OS.

## Build and run

```bash
npm install
npm run build
npm start
```

Other scripts:

- `npm run typecheck` — TypeScript check without emit
- `npm test` — run unit tests

## Branching and releases

| Branch | Purpose |
|--------|---------|
| `develop` | Day-to-day development; open PRs here |
| `main` | Stable releases only; merge from `develop` when ready |

**Workflow:**

1. Branch from `develop` for features and fixes.
2. Open pull requests targeting `develop`. CI runs on every push and PR.
3. When ready to ship, merge `develop` into `main` (via PR or fast-forward merge).
4. Each push to `main` runs the **Release** workflow: build, test, then create a GitHub release tagged `v{version}` from `package.json`.
5. Bump `version` in `package.json` before merging to `main` so each release gets a unique tag. If the tag already exists, the release job skips creation and logs a reminder to bump the version.

To start using `develop`:

```bash
git checkout -b develop
git push -u origin develop
```

Set `develop` as the default branch in GitHub repository settings if you want new PRs to target it by default.

## Cursor MCP configuration

Add this server in **Cursor → Settings → Features → MCP Servers** (adjust the path if your clone location differs):

```json
{
  "mcpServers": {
    "cursor-admin-mcp": {
      "command": "node",
      "args": ["C:\\dev\\repos\\others\\cursor_admin_mcp\\dist\\index.js"]
    }
  }
}
```

On Linux and macOS, use the appropriate absolute path to `dist/index.js`.

After changing MCP settings, reload MCP servers in Cursor.

## Manual smoke test

### Windows

1. Build the project: `npm run build`
2. Register the MCP server in Cursor using the config above.
3. Ask the agent to call `run_as_admin` with: `Write-Output "hello"`
4. Confirm the WPF dialog shows the exact command.
5. Click **Yes**, approve UAC, and verify output contains `hello`.
6. Run again and click **No** — verify the tool returns `Execution denied by user.` without a UAC prompt.
7. Confirm no leftover temp files remain under `%TEMP%`.

### Linux

1. Build the project: `npm run build`
2. Register the MCP server in Cursor.
3. Ask the agent to call `run_as_root` with: `echo "hello"`
4. Confirm the zenity dialog shows the exact command.
5. Click **Yes**, enter your sudo password in the zenity prompt, and verify output contains `hello`.
6. Run again and click **No** — verify the tool returns `Execution denied by user.` without a sudo prompt.
7. Confirm no leftover temp files remain under `/tmp`.

### macOS

1. Build the project: `npm run build`
2. Register the MCP server in Cursor.
3. Ask the agent to call `run_as_root` with: `echo "hello"`
4. Confirm the osascript dialog shows the exact command.
5. Click **Yes**, enter your administrator password in the osascript prompt, and verify output contains `hello`.
6. Run again and click **No** — verify the tool returns `Execution denied by user.` without a sudo prompt.
7. Confirm no leftover temp files remain under `$TMPDIR`.

Calling `run_as_admin` on Linux or macOS, or `run_as_root` on Windows, returns a clear platform error without elevation.

## SDK note

This project uses `@modelcontextprotocol/server@2.0.0-alpha.2` (MCP TypeScript SDK v2 alpha). The v2 API may change before stable release.

## License

MIT — see [LICENSE](LICENSE).
