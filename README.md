# 1password-enconvo

Plugin 5 of the Agent Plugins series — original work, not a repo conversion.

A one-plugin folder marketplace (`1password-agents`) carrying **1Password Environments for Enconvo**: list, create and rename Environments, add variables, and mount on-demand `.env` files — **with secrets never returned to the agent**.

- Security-led, Security-category Enconvo native plugin (`function_command`s + Local API routes + bundled agent skill + full setup doctor).
- A thin curated stdio client over 1Password's official **Environments MCP server** (`1password-mcp`, provisioned by the 1Password desktop app). No server code bundled.
- The only value path is `append_variables`, one-way into the vault; `list_variables` returns names only; mounts resolve on demand inside processes and are never read back by the plugin. The bundled skill teaches agents the same policy.

## Install

```sh
~/.config/enconvo/bin/enconvo plugin marketplace add \
  ~/Documents/Agent Plugins/1password-enconvo/marketplace
~/.config/enconvo/bin/enconvo plugin install 1password-enconvo@1password-agents
```

(When developing from this folder, `npm run build` inside `marketplace/plugins/1password-enconvo` installs the plugin directly; the marketplace then refuses `plugin install` with "is an Enconvo plugin's source code" — that is expected.)

## Update

The marketplace is read where it stands: edit in place, then Plugins page > … > Check for updates.

## Build

```sh
cd marketplace/plugins/1password-enconvo
npm install --include=dev   # npm omit=dev silently strips devDependencies otherwise
npm run build
npm run validate
```

MIT — Iteractive Development, https://iteractive.dev
