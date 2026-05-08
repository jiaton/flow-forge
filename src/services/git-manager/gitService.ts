/**
 * MR Manager Service Layer
 * Business logic for MR operations
 */

export interface MRStatusInfo {
  color: 'default' | 'primary' | 'success' | 'error';
  className: string;
}

export interface PipelineStatusInfo {
  icon: string;
  color: 'default' | 'warning' | 'success' | 'error';
  className: string;
}

/**
 * Get status color and styling for MR status
 */
export const getMRStatusInfo = (status: string): MRStatusInfo => {
  const statusMap: Record<string, MRStatusInfo> = {
    draft: { color: 'default', className: 'draft' },
    open: { color: 'primary', className: 'open' },
    merged: { color: 'success', className: 'merged' },
    closed: { color: 'error', className: 'closed' },
  };

  return statusMap[status] || { color: 'default', className: 'unknown' };
};

/**
 * Get pipeline status information
 */
export const getPipelineStatusInfo = (status: string): PipelineStatusInfo => {
  const statusMap: Record<string, PipelineStatusInfo> = {
    pending: { icon: 'schedule', color: 'default', className: 'pending' },
    running: { icon: 'playArrow', color: 'warning', className: 'running' },
    passed: { icon: 'checkCircle', color: 'success', className: 'passed' },
    success: { icon: 'checkCircle', color: 'success', className: 'success' },
    failed: { icon: 'error', color: 'error', className: 'failed' },
    canceled: { icon: 'cancel', color: 'default', className: 'canceled' },
  };

  return statusMap[status] || { icon: 'schedule', color: 'default', className: 'unknown' };
};

/**
 * Format date to relative time string
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Check if approvals are sufficient
 */
export const hasRequiredApprovals = (approvals: number, required: number): boolean => {
  return approvals >= required;
};
