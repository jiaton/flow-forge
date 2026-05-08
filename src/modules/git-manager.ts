/**
 * Git Manager Module
 *
 * Git provider merge/pull request tracking and management
 * Supports GitLab, GitHub, Bitbucket, and other git hosting providers
 */

import { Module } from '../core/module-system/types';
import GitManager from '../components/GitManager/GitManager';

export const gitManagerModule: Module = {
  metadata: {
    id: 'git-manager',
    name: 'Git Manager',
    description: 'Track and manage merge requests / pull requests from git providers',
    version: '1.0.0',
    icon: 'MergeType',
    route: 'git-manager',
    enabled: true,
    order: 30,
    teamSpecific: false,
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[GitManager] Module loaded');
      // Initialize git provider settings from DB
      try {
        await window.electronAPI.db.gitSettings.get();
      } catch (error) {
        console.error('[GitManager] Failed to load git provider settings:', error);
      }
    },

    onUnload: async () => {
      console.log('[GitManager] Module unloaded');
    },

    onTeamChange: async (team: string) => {
      console.log(`[GitManager] Team changed to: ${team}`);
    },
  },

  component: GitManager,

  getBadge: () => {
    // TODO: Return count of pending MRs/PRs
    // This would require accessing the MR state from the store
    return null;
  },
};
