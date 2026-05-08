import React from 'react';
import { Box } from '@mui/material';
import ModuleSidebar from './ModuleSidebar';
import TopBar from './TopBar';
import MainContent from './MainContent';
import { useDbAppStore as useAppStore } from '../../stores/dbAppStore';

const MainLayout: React.FC = () => {
  useAppStore();

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <ModuleSidebar />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TopBar />
        <MainContent />
      </Box>
    </Box>
  );
};

export default MainLayout;