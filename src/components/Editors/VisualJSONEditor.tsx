/**
 * Visual JSON Editor (Under Development)
 *
 * This is a placeholder component. The full implementation will include:
 * - Visual JSON structure builder with drag-and-drop
 * - Monaco editor integration
 * - Component-based JSON construction
 * - Template management
 *
 * When implementing:
 * - Create hook: src/hooks/visual-json-editor/useVisualJSONEditor.ts
 * - Create service: src/services/visual-json-editor/jsonEditorService.ts
 */

import { Box, Paper, Typography, Alert } from '@mui/material';
import { Construction } from '@mui/icons-material';

interface VisualJSONEditorProps {
  viewId: string;
}

const VisualJSONEditor: React.FC<VisualJSONEditorProps> = ({ viewId: _viewId }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper
        sx={{
          p: 4,
          maxWidth: 800,
          mx: 'auto',
          mt: 8,
          textAlign: 'center',
        }}
      >
        <Construction sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />

        <Typography variant="h4" gutterBottom>
          Visual JSON Editor
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          This module is under development
        </Typography>

        <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" gutterBottom>
            Planned Features:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Drag-and-drop JSON structure builder</li>
            <li>Visual component library</li>
            <li>Monaco code editor integration</li>
            <li>Template management system</li>
            <li>Import/Export functionality</li>
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default VisualJSONEditor;
