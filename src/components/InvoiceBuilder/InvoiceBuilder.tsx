/**
 * Invoice Builder (Under Development)
 *
 * This is a placeholder component. The full implementation will include:
 * - Dynamic invoice line item management
 * - Tax and discount calculations
 * - Template system for reusable invoice structures
 * - PDF export functionality
 *
 * When implementing:
 * - Create hook: src/hooks/invoice-builder/useInvoiceBuilder.ts
 * - Create service: src/services/invoice-builder/invoiceBuilderService.ts
 */

import { Box, Paper, Typography, Alert } from '@mui/material';
import { Construction } from '@mui/icons-material';

interface InvoiceBuilderProps {
  viewId: string;
}

const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({ viewId: _viewId }) => {
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
          Invoice Builder
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          This module is under development
        </Typography>

        <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" gutterBottom>
            Planned Features:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Create and manage invoice line items</li>
            <li>Automatic tax and discount calculations</li>
            <li>Drag-and-drop item reordering</li>
            <li>Invoice template management</li>
            <li>PDF generation and export</li>
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default InvoiceBuilder;
