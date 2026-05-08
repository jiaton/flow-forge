# Service Definition Guide

## Service File Format

Each service is defined in a YAML file in `config/services/`. Files are auto-discovered recursively.

```yaml
serviceId: my-service
name: My Service
type: Backend API
description: What this service does
port: 8080
path: $HOME/projects/my-service

commands:
  start: cd $HOME/projects/my-service && npm start
  stop: pkill -f 'my-service'
  check: pgrep -f 'my-service'

environments:
  local: http://localhost:8080
  dev: https://dev.example.com
```

## Required Fields

- **`serviceId`** — Unique identifier (lowercase, dashes, underscores)
- **`name`** — Display name
- **`type`** — Category label (e.g., Backend API, Frontend, Microservice, Infrastructure)
- **`description`** — Brief description
- **`port`** — Port number (or null)

## Optional Fields

- **`path`** — Local filesystem path (supports `$HOME` and `~`)
- **`mode`** — Execution mode: `process` (default) or `docker`
- **`git`** — Git configuration
  - `projectId` — Repository ID
  - `defaultReviewers` — List of reviewer usernames
- **`commands`** — Shell commands
  - `start` — Start the service (ignored when `mode: docker`)
  - `stop` — Stop the service (ignored when `mode: docker`)
  - `check` — Check if running
  - `openIDE` — Override global IDE setting (single string or list)
- **`docker`** — Docker-specific config (only when `mode: docker`)
  - `composePath` — Path to compose file (default: `docker-compose.yml`)
  - `service` — Specific compose service name (optional, default: all)
  - `pull` — Image pull strategy: `auto`, `always`, or `never`
- **`quickCommands`** — List of shortcut commands available in context menu
  - `name` — Display name
  - `command` — Shell command to run
- **`routines`** — Named commands for batch operations (key: name, value: command)
- **`environments`** — URL map per environment (any keys you want)

## Docker Mode

For services managed via docker-compose:

```yaml
serviceId: local-smtp
name: Local SMTP
mode: docker
type: Infrastructure
description: Local email server
port: 5001
path: $HOME/dev/local-smtp
docker:
  composePath: docker-compose.yml
environments:
  local: http://localhost:5001
```

No `commands.start` or `commands.stop` needed — Docker mode handles lifecycle automatically.

## Quick Commands & Routines

```yaml
quickCommands:
  - name: Install Dependencies
    command: yarn install
  - name: Run Tests
    command: yarn test

routines:
  update: git pull && yarn install
  build: yarn build
  clean: rm -rf dist node_modules
```

Quick commands appear in the right-click context menu. Routines can be triggered individually or as batch operations.

## IDE Override

By default, services use the global IDE setting from `global-settings.yaml`. To override per-service:

```yaml
# Single IDE
commands:
  openIDE: idea $HOME/projects/my-service

# Multiple IDEs (shows submenu)
commands:
  openIDE:
    - name: IntelliJ
      command: idea $HOME/projects/my-service
    - name: VS Code
      command: code $HOME/projects/my-service
```
