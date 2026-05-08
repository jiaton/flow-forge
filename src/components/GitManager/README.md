# MR Manager - GitLab Merge Request Tracking

## Overview

The MR Manager is a comprehensive GitLab merge request tracking system integrated into FlowForge. It allows developers to track, monitor, and manage merge requests with persistent storage and automatic updates.

## Features

### Core Features
- **Track GitLab MRs**: Add merge requests by URL for tracking
- **Auto-refresh**: Configurable automatic updates of MR status
- **Service Association**: Link MRs to specific services (auto-detected from branch names)
- **Pipeline Status**: Real-time pipeline and approval status
- **Local Notes**: Add personal notes to tracked MRs
- **Custom Tags**: Organize MRs with custom tags
- **Persistent Storage**: All data stored in local SQLite database

### Service Detection
The system automatically detects service names from branch patterns:
- Format: `feature/SERVICE-123-description`
- Example: `feature/PROJ-456-add-payment-flow` → Service: `backend-api`

## Configuration

### Initial Setup

1. **Configure GitLab Settings**
   - Click the "Settings" button in MR Manager
   - Enter your GitLab URL (default: `https://gitlab.example.com`)
   - Enter your Personal Access Token (requires `read_api` scope)
   - Enter Project ID (e.g., `12345`)
   - Set auto-refresh interval (default: 300 seconds)

2. **Generate Personal Access Token**
   - Go to GitLab → User Settings → Access Tokens
   - Create token with `read_api` scope
   - Copy and paste into MR Manager settings

### App Configuration (`config/app.config.yaml`)

```yaml
otherServices:
  gitlab:
    name: "GitLab"
    description: "GitLab MR tracking configuration"
    baseUrl: "https://gitlab.example.com"
    apiUrl: "https://gitlab.example.com/api/v4"
    defaultReviewers:
      - "reviewer1"
      - "reviewer2"
      - "reviewer3"
```

## Usage

### Track a Merge Request

1. Click "Track MR" button
2. Paste GitLab MR URL (e.g., `https://gitlab.example.com/project/-/merge_requests/123`)
3. Optionally select a service (or let it auto-detect)
4. Click "Track MR"

### Manage Tracked MRs

- **Refresh All**: Click "Refresh" to update all MRs
- **Open in GitLab**: Click the launch icon to open MR in browser
- **Edit Details**: Click menu (⋮) → Edit to add notes, tags, or change service
- **Remove**: Click menu (⋮) → Remove to stop tracking

### View Information

Each MR displays:
- Title and ID
- Associated service
- Source and target branches
- MR status (draft, open, merged, closed)
- Pipeline status (pending, running, passed, failed)
- Approval count vs. required approvals
- Comment count
- Last updated time

## Database Schema

### GitLab Settings Table
```sql
gitlab_settings (
  id INTEGER PRIMARY KEY,
  gitlab_url TEXT,
  api_url TEXT,
  access_token TEXT,  -- Encrypted
  project_id TEXT,
  default_reviewers TEXT,  -- JSON array
  refresh_interval INTEGER,
  updated_at DATETIME
)
```

### Merge Requests Table
```sql
merge_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gitlab_url TEXT,
  project_id TEXT,
  mr_iid TEXT,
  title TEXT,
  description TEXT,
  source_branch TEXT,
  target_branch TEXT,
  status TEXT,
  author TEXT,
  assignee TEXT,
  reviewers TEXT,  -- JSON array
  pipeline_status TEXT,
  created_at TEXT,
  updated_at TEXT,
  merged_at TEXT,
  approvals_count INTEGER,
  required_approvals INTEGER,
  comments_count INTEGER,
  changes_count INTEGER,
  web_url TEXT,
  service_name TEXT,  -- New field for service association
  local_notes TEXT,
  custom_tags TEXT,  -- JSON array
  tracked_since DATETIME,
  last_fetched DATETIME,
  UNIQUE(gitlab_url, project_id, mr_iid)
)
```

## Architecture

### File Structure
```
src/components/MRManager/
├── MRManager.tsx              # Main component (200 lines)
├── GitLabSettingsDialog.tsx   # Settings dialog (150 lines)
├── TrackMRDialog.tsx          # Track MR dialog (100 lines)
├── EditMRDialog.tsx           # Edit MR dialog (120 lines)
└── README.md                  # Documentation

src/hooks/
└── useGitLab.ts              # GitLab operations hook

electron/services/gitlab/
├── gitlabService.js          # GitLab API service
└── ipcHandlers.js            # IPC handlers for GitLab

electron/database/
├── schema.js                 # Database schema (updated)
└── repositories.js           # Repository classes (updated)
```

### API Integration

The system uses GitLab REST API v4:
- **GET** `/projects/:id/merge_requests/:mr_iid` - Fetch MR details
- **GET** `/projects/:id/merge_requests/:mr_iid/approvals` - Fetch approvals
- **GET** `/projects/:id/merge_requests/:mr_iid/discussions` - Fetch comments

### Auto-refresh

MRs are automatically refreshed based on the configured interval:
- Default: 300 seconds (5 minutes)
- Minimum: 60 seconds
- Silent background refresh to avoid UI interruption

## Security

- **Access Token Encryption**: Tokens should be encrypted using Electron's `safeStorage` API (recommended)
- **Local Storage**: All data stored in local SQLite database
- **No Sensitive Data**: No passwords or API keys stored in plain text

## Integration with Pre-push Script

The MR Manager complements your existing pre-push script by:
1. Auto-tracking MRs created by the script
2. Displaying real-time status updates
3. Showing approval and review progress
4. Linking MRs to their respective services

## Troubleshooting

### Token Validation Fails
- Ensure token has `read_api` scope
- Check GitLab URL is correct
- Verify network connectivity

### MRs Not Refreshing
- Check auto-refresh interval in settings
- Verify access token is still valid
- Check browser console for errors

### Service Not Detected
- Branch must follow pattern: `feature/SERVICE-###-description`
- Manually set service in Edit dialog if needed

## Future Enhancements

Potential improvements:
- Webhook support for real-time updates
- Multiple project support
- MR filtering and searching
- Approval rule visualization
- Comment thread preview
- CI/CD pipeline details
