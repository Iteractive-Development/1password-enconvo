# 1password-enconvo

Plugin 5 of the Agent Plugins series — original work, not a repo conversion.

**1Password Environments for Enconvo** as a flat native plugin: list, create and rename Environments, add variables, and mount on-demand `.env` files — **with secrets never returned to the agent**.

- Security-led, Security-category Enconvo native plugin (`function_command`s + Local API routes + bundled agent skill + full setup doctor).
- A thin curated stdio client over 1Password's official **Environments MCP server** (`1password-mcp`, provisioned by the 1Password desktop app). No server code bundled.
- The only value path is `append_variables`, one-way into the vault; `list_variables` returns names only; mounts resolve on demand inside processes and are never read back by the plugin. The bundled skill teaches agents the same policy.

## Install

Install straight from the GitHub repo (public):

```sh
enconvo plugin install Iteractive-Development/1password-enconvo
```

Or from a local clone / folder:

```sh
enconvo plugin install /path/to/1password-enconvo
```

## Update

Edit the source, raise `version` in `package.json`, then reinstall (or push to
GitHub and Check for updates on the Plugins page).

## Build

```sh
npm install --include=dev   # npm omit=dev silently strips devDependencies otherwise
npm run build
npm run validate
```

Build from the repo root — this repository is the flat Enconvo plugin itself
(`package.json` with commands, `src/`, `skills/`, `assets/`).

MIT — Iteractive Development, https://iteractive.dev
