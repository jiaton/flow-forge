import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { Send, Save, Download } from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { useThemeStore } from '../../stores/themeStore';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

interface JSONEditorProps {
  viewId: string;
}

const JSONEditor: React.FC<JSONEditorProps> = ({ viewId }) => {
  const { isDarkMode } = useThemeStore();
  const { updateViewState, addNotification } = useAppStore();
  const [jsonContent, setJsonContent] = useState(`{
  "invoice": {
    "number": "INV-2024-001",
    "date": "2024-01-15",
    "dueDate": "2024-02-15",
    "customer": {
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "address": {
        "street": "123 Business Ave",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94105"
      }
    },
    "items": [
      {
        "description": "Professional Services",
        "quantity": 10,
        "rate": 150.00,
        "amount": 1500.00
      },
      {
        "description": "Software License",
        "quantity": 1,
        "rate": 500.00,
        "amount": 500.00
      }
    ],
    "subtotal": 2000.00,
    "tax": 180.00,
    "total": 2180.00
  }
}`);
  const [response, setResponse] = useState('');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    try {
      JSON.parse(jsonContent);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  }, [jsonContent]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setJsonContent(value);
      updateViewState(viewId, { modified: true, content: value });
    }
  };

  const handleSend = async () => {
    if (!isValid) {
      addNotification({
        message: 'Invalid JSON format',
        type: 'error',
      });
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResponse = {
        status: 'success',
        message: 'JSON payload processed successfully',
        id: `req_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        data: JSON.parse(jsonContent),
      };

      setResponse(JSON.stringify(mockResponse, null, 2));
      addNotification({
        message: 'JSON payload sent successfully',
        type: 'success',
      });
    } catch {
      addNotification({
        message: 'Failed to send JSON payload',
        type: 'error',
      });
    }
  };

  const handleSave = () => {
    updateViewState(viewId, { modified: false });
    addNotification({
      message: 'JSON content saved',
      type: 'success',
    });
  };

  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payload.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">JSON Payload Editor</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Save />}
              variant="outlined"
              size="small"
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              startIcon={<Download />}
              variant="outlined"
              size="small"
              onClick={handleDownload}
            >
              Download
            </Button>
            <Button
              startIcon={<Send />}
              variant="contained"
              size="small"
              onClick={handleSend}
              disabled={!isValid}
            >
              Send
            </Button>
          </Box>
        </Box>
        {!isValid && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Invalid JSON format. Please check your syntax.
          </Alert>
        )}
      </Box>

      <Box sx={{ flex: 1, display: 'flex' }}>
        <Paper sx={{ flex: 1, m: 1, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            JSON Editor
          </Typography>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonContent}
            onChange={handleEditorChange}
            theme={isDarkMode ? 'vs-dark' : 'vs'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </Paper>

        <Paper sx={{ flex: 1, m: 1, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            Response Preview
          </Typography>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={response || '// Response will appear here after sending'}
            theme={isDarkMode ? 'vs-dark' : 'vs'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default JSONEditor;