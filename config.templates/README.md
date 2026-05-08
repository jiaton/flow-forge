# Configuration Templates

This directory contains **generic, company-agnostic configuration templates** that are shipped with FlowForge.

## Purpose

- **Bundled with the app** - Included in `.dmg`, `.exe`, and other distribution packages
- **Default configurations** - Serve as the source of truth for initial setup
- **Documentation by example** - Show users how to structure their configs
- **Version controlled** - Changes are tracked in git and reviewed

## Directory Structure

```
config.templates/
├── app.config.yaml           # Application settings and module definitions
├── team-presets.yaml         # Team configurations and preset services
├── global-settings.yaml      # IDE settings
├── services/                 # Example service definitions
│   ├── backend/
│   │   └── api-service.yaml
│   ├── frontend/
│   │   └── web-app.yaml
│   ├── microservices/
│   │   └── payment-service.yaml
│   └── infrastructure/
│       └── database.yaml
└── README.md
```

## How It Works

### Development Mode

When running `npm run electron:dev`:
- App reads from `config/` (your local, gitignored settings)
- Falls back to `config.templates/` if files are missing
- You can test with real data in `config/` without affecting templates

### Production Mode

When users install the packaged app:
1. **First Run**: Templates are copied from app bundle → user's config directory
   - macOS: `~/.flowforge/config/`
   - Windows: `~/.flowforge/config/`
   - Linux: `~/.flowforge/config/`

2. **Subsequent Runs**: App reads from user's config directory
   - User can modify configs freely
   - Templates remain unchanged in app bundle as reference

## Guidelines

### When to Update Templates

✅ **DO update templates when:**
- Adding new configuration options
- Changing config file structure
- Adding new service examples
- Improving documentation
- Removing company-specific references

❌ **DON'T put in templates:**
- Real company domains (use `example.com`)
- Actual credentials or API keys
- Personal file paths or usernames
- Company-specific service names
- Real repository URLs

### Template Naming Convention

- **Config files**: Use actual filename (e.g., `app.config.yaml`)
- **Service files**: Use actual filename (e.g., `api-service.yaml`)
- **Documentation**: Use `.md` extension

### Generic vs Specific

Templates should be **maximally generic and portable**:

```yaml
# ❌ BAD - Company-specific
baseUrl: "https://git.hq.acmecorp.com"
start: "okta-aws-cli -o acmecorp.okta.com ..."

# ✅ GOOD - Generic
baseUrl: "https://gitlab.example.com"
start: "cd $HOME/projects/service && npm start"
```

## File Locations Reference

| Environment | Config Location | Templates Location | Notes |
|-------------|----------------|-------------------|--------|
| Development | `project/config/` | `project/config.templates/` | Config is gitignored |
| Production | `~/.flowforge/config/` | `~/.flowforge/config.examples/` | Templates are read-only |

## For Developers

- **Never modify `config/`** - This is for local dev only and gitignored
- **Update `config.templates/`** - This is shipped with the app
- **Test both modes** - Ensure templates work for fresh installs
- **Document changes** - Update docs/ when changing structure

## For Users

If you installed FlowForge from a `.dmg` or package:
- Your configs are in `~/.flowforge/config/`
- You can safely edit these files
- To reset a file to default: delete it and restart the app (it will be recreated from templates)
- Templates are bundled in the app and can be viewed via Help → View Config Templates

---

**See also:**
- [Quick Start Guide](../config/docs/QUICK-START.md)
- [Service Definition Reference](../config/docs/SERVICE-DEFINITION.md)
