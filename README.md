# cursor_admin_mcp

Secure Windows MCP server that exposes a `run_as_admin` tool for Cursor agents. Every elevated PowerShell command requires explicit visual user approval via a native WPF dialog before UAC elevation runs.

## Requirements

- Windows 10 or later
- Node.js 20 or later
- Windows PowerShell 5.1 (default `powershell` on Windows)
- WPF (`PresentationFramework`) for the approval dialog

## Security model

1. The agent sends a PowerShell command string to `run_as_admin`.
2. The server writes the command to an isolated temporary `.ps1` file (no inline string execution).
3. A wrapper script shows a WPF `MessageBox` with the **exact** command payload.
4. If the user clicks **Yes**, Windows UAC prompts for elevation and the payload runs elevated.
5. If the user clicks **No**, execution stops and the tool returns `Execution denied by user.`
6. stdout/stderr are captured to a temporary log file and returned to the agent.
7. All temporary files are deleted after each invocation.

The agent cannot bypass approval or UAC. This server is **Windows-only**.

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

After changing MCP settings, reload MCP servers in Cursor.

## Manual smoke test

1. Build the project: `npm run build`
2. Register the MCP server in Cursor using the config above.
3. Ask the agent to call `run_as_admin` with: `Write-Output "hello"`
4. Confirm the WPF dialog shows the exact command.
5. Click **Yes**, approve UAC, and verify output contains `hello`.
6. Run again and click **No** — verify the tool returns `Execution denied by user.` without a UAC prompt.
7. Confirm no leftover `mcp_payload_*`, `mcp_wrapper_*`, or `mcp_output_*` files remain under `%TEMP%`.

## SDK note

This project uses `@modelcontextprotocol/server@2.0.0-alpha.2` (MCP TypeScript SDK v2 alpha). The v2 API may change before stable release.

## License

MIT — see [LICENSE](LICENSE).
