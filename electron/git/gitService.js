/**
 * Git Provider API Service
 * Handles interactions with git hosting providers (GitLab, GitHub, Bitbucket, etc.)
 *
 * Currently optimized for GitLab API, but designed to be extended for other providers
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('GitService');

export class GitService {
  constructor(config, serviceConfig = null) {
    this.provider = config.provider || 'gitlab';
    this.baseUrl = config.gitUrl || 'https://gitlab.example.com';
    this.apiUrl = config.apiUrl || 'https://gitlab.example.com/api/v4';
    this.token = config.accessToken;
    this.serviceConfig = serviceConfig;
    this.serviceMapping = config.serviceMapping || {};
    this.fallbackToBranchDetection = config.fallbackToBranchDetection !== false;
  }

  /**
   * Get project ID for a service
   */
  getProjectId(serviceName) {
    return this.serviceConfig?.[serviceName]?.git?.projectId || null;
  }

  /**
   * Get default reviewers for a service
   */
  getDefaultReviewers(serviceName) {
    // Service-specific reviewers take precedence
    if (this.serviceConfig?.[serviceName]?.git?.defaultReviewers) {
      return this.serviceConfig[serviceName].git.defaultReviewers;
    }
    // Fall back to global settings
    return this.serviceConfig?.globalSettings?.git?.defaultReviewers || [];
  }

  /**
   * Parse MR/PR URL to extract components
   * Supports formats:
   * - GitLab: https://gitlab.example.com/project/path/-/merge_requests/123
   * - GitHub: https://github.com/owner/repo/pull/123 (future)
   * - Bitbucket: https://bitbucket.org/project/repo/pull-requests/123 (future)
   */
  parseMRUrl(url) {
    // GitLab pattern: https://domain/project/path/-/merge_requests/123
    const gitlabRegex = /^(https?:\/\/[^\/]+)\/(.+)\/-\/merge_requests\/(\d+)/;
    const gitlabMatch = url.match(gitlabRegex);

    if (gitlabMatch) {
      return {
        gitUrl: gitlabMatch[1],
        projectId: encodeURIComponent(gitlabMatch[2]),
        mrIid: gitlabMatch[3],
      };
    }

    // TODO: Add GitHub and Bitbucket URL parsing
    // GitHub pattern: https://github.com/owner/repo/pull/123
    // Bitbucket pattern: https://bitbucket.org/project/repo/pull-requests/123

    throw new Error('Invalid MR/PR URL format. Expected GitLab format: https://gitlab.com/project/-/merge_requests/123');
  }

  /**
   * Fetch merge request details
   */
  async fetchMR(projectId, mrIid) {
    const url = `${this.apiUrl}/projects/${projectId}/merge_requests/${mrIid}`;
    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Git API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Fetch MR approval information
   */
  async fetchMRApprovals(projectId, mrIid) {
    const url = `${this.apiUrl}/projects/${projectId}/merge_requests/${mrIid}/approvals`;
    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.token,
      },
    });

    if (!response.ok) {
      // Approvals might not be available in all editions
      logger.warn(`Could not fetch approvals: ${response.statusText}`);
      return { approved_by: [], approvals_required: 0 };
    }

    return await response.json();
  }

  /**
   * Fetch MR discussions (comments)
   */
  async fetchMRDiscussions(projectId, mrIid) {
    const url = `${this.apiUrl}/projects/${projectId}/merge_requests/${mrIid}/discussions`;
    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.token,
      },
    });

    if (!response.ok) {
      logger.warn(`Could not fetch discussions: ${response.statusText}`);
      return [];
    }

    return await response.json();
  }

  /**
   * Fetch complete MR data with all related information
   */
  async fetchCompleteMRData(mrUrl) {
    const { gitUrl, projectId, mrIid } = this.parseMRUrl(mrUrl);

    const [mrData, approvals, discussions] = await Promise.all([
      this.fetchMR(projectId, mrIid),
      this.fetchMRApprovals(projectId, mrIid).catch(() => ({ approved_by: [], approvals_required: 0 })),
      this.fetchMRDiscussions(projectId, mrIid).catch(() => []),
    ]);

    // Count all notes across all discussions
    const totalComments = discussions.reduce((count, discussion) => {
      return count + (discussion.notes?.length || 0);
    }, 0);

    // Get latest comments for tooltip
    const latestComments = discussions
      .flatMap(d => (d.notes || []).map(note => ({
        author: note.author?.username || note.author?.name || 'Unknown',
        body: note.body,
        created_at: note.created_at,
      })))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);

    // Get approver details
    const approvers = (approvals.approved_by || []).map(approval => ({
      user: approval.user?.username || approval.user?.name || 'Unknown',
      approved_at: approval.created_at,
    }));

    return {
      gitUrl: gitUrl,
      projectId: decodeURIComponent(projectId),
      mrIid: mrIid,
      title: mrData.title,
      description: mrData.description,
      sourceBranch: mrData.source_branch,
      targetBranch: mrData.target_branch,
      status: this._normalizeStatus(mrData.state),
      author: mrData.author?.username || mrData.author?.name || 'Unknown',
      assignee: mrData.assignee?.username || mrData.assignee?.name || null,
      reviewers: (mrData.reviewers || []).map(r => r.username || r.name),
      pipelineStatus: mrData.head_pipeline?.status || mrData.pipeline?.status || 'pending',
      createdAt: mrData.created_at,
      updatedAt: mrData.updated_at,
      mergedAt: mrData.merged_at,
      approvalsCount: approvals.approved_by?.length || 0,
      requiredApprovals: approvals.approvals_required || 0,
      commentsCount: totalComments,
      changesCount: mrData.changes_count,
      webUrl: mrData.web_url,
      metadata: {
        approvers,
        latestComments,
      },
    };
  }

  /**
   * Normalize provider state to our internal status
   */
  _normalizeStatus(providerState) {
    const statusMap = {
      'opened': 'open',
      'closed': 'closed',
      'merged': 'merged',
      'locked': 'closed',
    };
    return statusMap[providerState] || providerState;
  }

  /**
   * Extract service name from URL path or branch name
   * 1. First tries to match URL path against serviceMapping config
   * 2. Falls back to branch name pattern if enabled
   */
  extractServiceName(projectPath, branchName) {
    // Decode the project path (it comes URL encoded from parseMRUrl)
    const decodedPath = decodeURIComponent(projectPath);

    // Try URL path mapping first
    if (this.serviceMapping && this.serviceMapping[decodedPath]) {
      return this.serviceMapping[decodedPath];
    }

    // Fallback to branch name detection
    if (this.fallbackToBranchDetection && branchName) {
      return this.extractServiceFromBranch(branchName);
    }

    return null;
  }

  /**
   * Extract service name from branch name (legacy method)
   * Handles patterns like: feature/SERVICE-123-description
   */
  extractServiceFromBranch(branchName) {
    // Pattern: feature/ABC-123-description or just feature/ABC-description
    const match = branchName.match(/feature\/([A-Z0-9]+)[-_]/i);
    return match ? match[1] : null;
  }

  /**
   * Validate access token
   */
  async validateToken() {
    try {
      const url = `${this.apiUrl}/user`;
      const response = await fetch(url, {
        headers: {
          'PRIVATE-TOKEN': this.token,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
