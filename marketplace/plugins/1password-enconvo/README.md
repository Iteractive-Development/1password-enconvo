# 1password-enconvo

Plugin 5 of the Agent Plugins series — original work, not a repo conversion.

Manage **1Password Environments** from Enconvo: list, create and rename Environments, add variables, and mount on-demand `.env` files — **with secrets never returned to the agent**.

A security-led, curated Enconvo native plugin over 1Password's official **Environments MCP server** (`1password-mcp`, provisioned by the 1Password desktop app). No server code is bundled; the plugin is a thin stdio client, so upstream security stays 1Password's.

## Security model

- No command, route or library path returns a secret value.
- `append_variables` is the only value path and it is one-way: into the vault.
- `list_variables` returns variable names only (server-enforced by design).
- Mounted `.env` files resolve values on demand inside processes; the file on disk never contains them, and this plugin never reads a mount back. Never read a mount into a chat or agent context.
- 1Password's own gates stay in front: per-Environment approval prompts and enterprise policy (Policies > Agentic permissions). The plugin never bypasses them.

## Install

From the Enconvo plugin store, or from the folder marketplace:

```sh
~/.config/enconvo/bin/enconvo plugin marketplace add \
  ~/Documents/Agent Plugins/1password-enconvo/marketplace
~/.config/enconvo/bin/enconvo plugin install 1password-enconvo@1password-agents
```

## Requirements

- 1Password desktop app, signed in, with **Settings > Developer > Integrate with MCP clients** enabled.
- A 1Password account plan that includes Environments (enterprise admins: Policies > Agentic permissions must allow the local MCP server).

Run **1Password: Doctor** to check the whole chain; every failed check carries its exact fix.

## Commands

All commands are agent-callable (`function_command`) and mirrored as Local API routes at `/api/1password-enconvo/<name>`:

| Command | What it does |
| --- | --- |
| `list_environments` | List Environments with IDs and names (read-only) |
| `create_environment` | Create an Environment by name |
| `rename_environment` | Rename by name or ID |
| `list_variables` | List variable **names** only |
| `append_variables` | Add/update variables — values go into the vault only |
| `create_local_env_file` | Mount an on-demand `.env` file for a project |
| `list_local_env_files` | List mounted `.env` paths |
| `doctor` | Diagnose the setup; every check carries its fix |

Preferences (both optional): **Account ID** override, **1password-mcp path** override.

## Build

```sh
npm install --include=dev   # npm omit=dev silently strips devDependencies otherwise
npm run build               # builds and installs into the running Enconvo
npm run validate            # store validation
```

The bundled skill (`skills/1password-enconvo/SKILL.md`) teaches agents the workflows and the secrets policy, including the hard rule: **never read a mounted `.env` file into chat**.

## License

MIT — Iteractive Development, https://iteractive.dev
