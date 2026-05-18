# FlowForge

A modular, company-agnostic process orchestration and workflow management platform built with Electron, React, and TypeScript.

## Features

- **Modular Plugin System** - Dynamically load and manage feature modules
- **Service Orchestration** - Start, stop, and monitor local development services
- **Dynamic Service Discovery** - Automatically discovers services from modular YAML files
- **Git Manager** - Track merge requests/pull requests across GitLab, GitHub, and more
- **Dark/Light Theme** - Beautiful Material-UI interface with theme support
- **Flexible YAML Configuration** - User-editable configuration with no hardcoded service definitions
- **macOS Native** - Built and tested for macOS (Apple Silicon & Intel)

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (Electron)
npm run electron:dev

# Build for production
npm run electron:build
```

## Configuration

FlowForge uses YAML configuration files with environment-aware path resolution:

| Mode | Config Location | Use Case |
|------|----------------|----------|
| **Production** (built app) | `~/.flowforge/config/` | End users with the desktop app |
| **Development** (`npm run electron:dev`) | `<project-root>/config/` | Developers working on FlowForge |

> **Note:** If you want to use the built-in example configs and team presets, use the [built desktop app](../../releases). In dev mode, configs are read from the project's `config/` directory (with fallback to `config.templates/`).

### Configuration Files

- `app.config.yaml` - Main application settings and module definitions
- `team-presets.yaml` - Team configurations and preset services
- `global-settings.yaml` - IDE, terminal, and file manager settings
- `services/` - **Modular service definitions** (auto-discovered)
  - `services/backend/` - Backend services
  - `services/frontend/` - Frontend applications
  - `services/microservices/` - Microservices
  - `services/infrastructure/` - Infrastructure services

### Quick Configuration Guide

**On first run**, config files are automatically created from `config/examples/`. You can:

1. **Edit existing services** in the `services/` directory
2. **Add new services** by creating `.yaml` files in any `services/` subdirectory
3. **Customize teams** in `team-presets.yaml`
4. **Configure tools** (IDE, terminal, file manager) in `global-settings.yaml`

See `config/docs/QUICK-START.md` for detailed setup instructions.

## Project Structure

```
flow-forge/
├── config/                      # YAML configuration files (user-editable)
│   ├── examples/               # Example configurations (copied on first run)
│   │   ├── app.config.yaml
│   │   ├── team-presets.yaml
│   │   ├── global-settings.yaml
│   │   └── services/           # Example service definitions
│   └── docs/                   # Configuration documentation
│       ├── QUICK-START.md
│       ├── SERVICE-DEFINITION.md
│       └── TROUBLESHOOTING.md
├── docs/                        # Architecture & contributing guides
├── electron/                    # Electron backend
│   ├── database/               # SQLite database (user preferences only)
│   ├── service-orchestration/  # Service management
│   │   └── config/
│   │       └── service-loader.js  # Dynamic service discovery
│   └── utils/                  # Backend utilities
└── src/                        # React frontend
    ├── core/                   # Framework code (module system, config, constants)
    ├── modules/                # Feature module definitions
    ├── components/             # UI components (organized by feature)
    ├── hooks/                  # Custom React hooks (grouped by module)
    ├── services/               # Service layer (grouped by module)
    ├── stores/                 # Zustand state management
    └── theme/                  # MUI theme configuration
```

## Development

```bash
# Run Vite dev server
npm run dev

# Run Electron in development
npm run electron:dev

# Lint code
npm run lint

# Build for production
npm run build:mac
```

## Creating Modules

FlowForge uses a plugin-based module system. See `docs/ARCHITECTURE.md` for module development patterns and `src/modules/MODULE_TEMPLATE/` for a starter template.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

MIT © FlowForge Contributors. See [LICENSE](LICENSE) for details.
