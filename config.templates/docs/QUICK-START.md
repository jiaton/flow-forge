# Quick Start Guide

## Adding a New Service

### Step 1: Create Service File

```bash
touch config/services/backend/my-service.yaml
```

### Step 2: Define the Service

```yaml
serviceId: my-service
name: My Service
type: Backend API
description: What this service does
port: 9000
path: $HOME/projects/my-service

commands:
  start: cd $HOME/projects/my-service && npm start

environments:
  local: http://localhost:9000
```

### Step 3: Restart the App

The service is auto-discovered on startup.

## Adding a Docker Service

```yaml
serviceId: my-db
name: My Database
mode: docker
type: Infrastructure
port: 5432
path: $HOME/projects/my-db
docker:
  composePath: docker-compose.yml
environments:
  local: http://localhost:5432
```

No start/stop commands needed — FlowForge manages the container lifecycle.

## Organizing Services

All structures work — the loader recursively finds all YAML files:

```
services/
├── backend/
├── frontend/
├── microservices/
└── infrastructure/
```

## Global Settings

Configure your IDE in `config/global-settings.yaml`:

```yaml
# Single IDE
ide:
  command: code-insiders

# Multiple IDEs (shows submenu on right-click)
ide:
  - command: code-insiders
  - command: idea
```

## Tips

- **Copy an existing service** — fastest way to create a new one
- **Use `mode: docker`** — for anything running in containers
- **Add `quickCommands`** — for frequently used shell commands
- **Add `routines`** — for batch operations (update, build, clean)
