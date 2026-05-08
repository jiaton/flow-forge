import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Chip,
  IconButton,
  Link,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Launch,
  Comment,
  CheckCircle,
  Error,
  Schedule,
  PlayArrow,
  Cancel,
  MoreVert,
  Code,
} from '@mui/icons-material';
import { getMRStatusInfo, getPipelineStatusInfo, formatRelativeTime, hasRequiredApprovals } from '../../services/git-manager/gitService';

interface GitTableRowProps {
  mr: Record<string, unknown>;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, mr: Record<string, unknown>) => void;
}

const pipelineIcons: Record<string, React.ReactElement> = {
  schedule: <Schedule color="action" />,
  playArrow: <PlayArrow color="warning" />,
  checkCircle: <CheckCircle color="success" />,
  error: <Error color="error" />,
  cancel: <Cancel color="action" />,
};

const GitTableRow: React.FC<GitTableRowProps> = ({ mr, onMenuOpen }) => {
  const statusInfo = getMRStatusInfo(mr.status);
  const pipelineInfo = getPipelineStatusInfo(mr.pipelineStatus);
  const isApproved = hasRequiredApprovals(mr.approvalsCount, mr.requiredApprovals);

  return (
    <TableRow 
      hover 
      sx={{
        transition: (theme) => theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.shorter,
        }),
      }}
    >
      <TableCell>
        <Box>
          <Typography variant="subtitle2">{mr.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            !{mr.mrIid} • by {mr.author}
            {mr.assignee && ` → ${mr.assignee}`}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        {mr.serviceName ? (
          <Chip
            icon={<Code />}
            label={mr.serviceName}
            size="small"
            variant="outlined"
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            None
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2">{mr.sourceBranch}</Typography>
          <Typography variant="caption" color="text.secondary">
            → {mr.targetBranch}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={mr.status}
          size="small"
          color={statusInfo.color}
          sx={{ fontWeight: 500 }}
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {pipelineIcons[pipelineInfo.icon]}
          <Chip
            label={mr.pipelineStatus}
            size="small"
            color={pipelineInfo.color}
            sx={{ fontWeight: 500 }}
          />
        </Box>
      </TableCell>
      <TableCell>
        <Tooltip
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Approvals: {mr.approvalsCount}/{mr.requiredApprovals}
              </Typography>
              {mr.metadata?.approvers && mr.metadata.approvers.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Approved by:
                  </Typography>
                  {(mr.metadata as { approvers: { user: string; approved_at: string }[] }).approvers.map((approval, idx: number) => (
                    <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                      • {approval.user} ({new Date(approval.approved_at).toLocaleString()})
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No approvals yet
                </Typography>
              )}
              {mr.reviewers && mr.reviewers.length > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Reviewers:
                  </Typography>
                  <Typography variant="body2">{mr.reviewers.join(', ')}</Typography>
                </Box>
              )}
            </Box>
          }
          arrow
          placement="left"
          componentsProps={{
            tooltip: {
              sx: {
                maxWidth: 400,
              },
            },
          }}
        >
          <Chip
            label={`${mr.approvalsCount}/${mr.requiredApprovals}`}
            size="small"
            color={isApproved ? 'success' : 'default'}
            sx={{ 
              fontWeight: 500,
              cursor: 'pointer',
            }}
          />
        </Tooltip>
      </TableCell>
      <TableCell>
        <Tooltip
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                {mr.commentsCount} {mr.commentsCount === 1 ? 'Comment' : 'Comments'}
              </Typography>
              {mr.metadata?.latestComments && mr.metadata.latestComments.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Latest comments:
                  </Typography>
                  {(mr.metadata as { latestComments: { author: string; body: string; created_at: string }[] }).latestComments.map((comment, idx: number) => (
                    <Box 
                      key={idx} 
                      sx={{ 
                        mb: 1.5,
                        pb: 1.5,
                        borderBottom: idx < mr.metadata.latestComments.length - 1 
                          ? (theme) => `1px solid ${theme.palette.divider}` 
                          : 'none',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {comment.author}:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, mb: 0.5 }}>
                        {comment.body.length > 100 ? comment.body.substring(0, 100) + '...' : comment.body}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(comment.created_at)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : mr.commentsCount > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Click refresh to load comments
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No comments yet
                </Typography>
              )}
            </Box>
          }
          arrow
          placement="left"
          componentsProps={{
            tooltip: {
              sx: {
                maxWidth: 500,
              },
            },
          }}
        >
          <Badge 
            badgeContent={mr.commentsCount} 
            color="primary"
            sx={{ cursor: 'pointer' }}
          >
            <Comment color="action" />
          </Badge>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {formatRelativeTime(mr.updatedAt)}
        </Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Open in GitLab">
            <IconButton
              size="small"
              component={Link}
              href={mr.webUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Launch />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={(e) => onMenuOpen(e, mr)}
          >
            <MoreVert />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default GitTableRow;
