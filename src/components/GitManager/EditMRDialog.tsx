import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
} from '@mui/material';

interface EditMRDialogProps {
  open: boolean;
  onClose: () => void;
  mergeRequest: Record<string, unknown>;
  onUpdate: (data: { notes?: string; tags?: string[]; serviceName?: string }) => Promise<{ success: boolean; error?: string }>;
  availableServices: string[];
}

const EditMRDialog: React.FC<EditMRDialogProps> = ({
  open,
  onClose,
  mergeRequest,
  onUpdate,
  availableServices,
}) => {
  const [notes, setNotes] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (open && mergeRequest) {
      setNotes(mergeRequest.localNotes || '');
      setServiceName(mergeRequest.serviceName || '');
      setTags(mergeRequest.customTags || []);
      setNewTag('');
    }
  }, [open, mergeRequest]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleUpdate = async () => {
    const result = await onUpdate({
      notes,
      serviceName: serviceName || undefined,
      tags,
    });

    if (result.success) {
      onClose();
    }
  };

  if (!mergeRequest) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit MR Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Merge Request
            </Typography>
            <Typography variant="body2" color="text.secondary">
              !{mergeRequest.mrIid} - {mergeRequest.title}
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Service</InputLabel>
            <Select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              label="Service"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableServices.map((service) => (
                <MenuItem key={service} value={service}>
                  {service}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your personal notes about this MR..."
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                fullWidth
              />
              <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                />
              ))}
              {tags.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No tags yet
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleUpdate}>
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { EditMRDialog };
export default EditMRDialog;
