---
name: 1password-enconvo
description: >
  Manage 1Password Environments from Enconvo: list, create and rename Environments, add variables, and mount on-demand .env files — with secrets never returned to the agent. By Iteractive Development.
metadata:
  author: Iteractive Development
  version: "1.0.0"
---

# 1Password Environments for Enconvo

Work with 1Password Environments through the `1password-enconvo` plugin: Environment management and on-demand `.env` mounting for projects and scripts.

## The one rule

**Secrets never enter agent context.** The plugin is built so no command or route can return a secret value:

- `list_variables` returns variable **names only**.
- `append_variables` is the only path values travel, and it is one-way: into the vault.
- Mounted `.env` files resolve secret values **inside processes** — the file on disk never contains them, and the plugin never reads a mount back.

**Hard guardrail for agents: never read a mounted `.env` file into chat or context** — not with `cat`, not with a file-read tool, not to "check it worked". Mounts are for process environments only. To verify a mount, use `list_local_env_files` (paths only) or run the process that consumes the variables.

First use of a tool against an Environment may show an approval prompt in the 1Password app (Touch ID). That prompt is a feature — never work around it. If the app is locked, unlock it and retry.

## Commands (also Local API routes)

Every command is callable as a route at `/api/1password-enconvo/<name>` with a JSON body:

| Command | Body / args | Returns |
| --- | --- | --- |
| `list_environments` | `{account_id?}` | account_id, count, environments [{id, name}] |
| `create_environment` | `{environmentName, account_id?}` | created name |
| `rename_environment` | `{environment, newName, account_id?}` | from → to |
| `list_variables` | `{environment, account_id?}` | variable names only |
| `append_variables` | `{environment, variables: [{name, value, concealed?}], account_id?}` | names added (values never echoed) |
| `create_local_env_file` | `{environment, mountPath, account_id?}` | mount path + handling note |
| `list_local_env_files` | `{environment, account_id?}` | mount paths only |
| `doctor` | `{account_id?, binary_path?}` | per-check pass/fail with fixes |

`environment` accepts a name or an ID; it is resolved through `list_environments`. `account_id` is optional everywhere — the plugin resolves it through the app.

## Workflows

**First-time setup** — run `doctor`. Work through its failed checks in order; each carries the exact fix. Typical causes: 1Password not installed, Developer > Integrate with MCP clients off, app locked, or an enterprise policy disabling the local MCP server (Policies > Agentic permissions).

**Put a project's secrets into 1Password** — create an Environment named after the project (`create_environment`), then `append_variables` for each variable. Mark human-facing values `concealed: true` (the default). If a secret previously lived in plaintext (code, `.env`, chat), rotate it after moving it in — moving does not undo past exposure, including Git history.

**Give a script or build its secrets** — `create_local_env_file` with an absolute `mountPath` (e.g. `/Users/me/proj/.env`), then run the process normally; it reads real values from the mount while the disk file stays value-free. List what is mounted with `list_local_env_files`.

**Audit an Environment** — `list_environments` + `list_variables` give names and shape without exposing anything; report coverage as a name checklist, never values.

## Troubleshooting

Run `doctor` first; it maps every failure to its fix. Quick map:

- *binary not found* → install 1Password, enable Settings > Developer > Integrate with MCP clients, keep the app running.
- *initialize or call timed out* → the app is locked or quit; unlock it.
- *authenticate fails* → approve the app's access prompt; check the Account ID preference if one is set.
- *Environments unreachable* → approve the prompt, or the plan/policy (Agentic permissions) blocks the local server.
- *Environment not found* → `list_environments` for exact names; they are case-sensitive.
