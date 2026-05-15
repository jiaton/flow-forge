import React, { useRef, useState } from 'react';
import {
  Box, Button, Select, MenuItem, FormControl, InputLabel,
  ButtonGroup, Popper, Grow, Paper, ClickAwayListener, MenuList,
} from '@mui/material';
import { Settings, AutoMode, ArrowDropDown, Terminal } from '@mui/icons-material';

interface ServiceActionsProps {
  onShowConfig: () => void;
  onShowRoutines: () => void;
  onLogLevelChange: (level: 'error' | 'warn' | 'info' | 'debug' | 'verbose') => void;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  activeRoutineNames?: string[] | null;
  onShowActiveRoutine?: (id: string) => void;
}

const ServiceActions: React.FC<ServiceActionsProps> = ({
  onShowConfig,
  onShowRoutines,
  onLogLevelChange,
  logLevel,
  activeRoutineNames,
  onShowActiveRoutine,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const hasActive = activeRoutineNames && activeRoutineNames.length > 0;

  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
      {/* Routines split button */}
      <ButtonGroup variant="outlined" size="small" ref={anchorRef}>
        <Button startIcon={<AutoMode />} onClick={onShowRoutines}>
          Routines
        </Button>
        {hasActive && (
          <Button
            size="small"
            onClick={() => setDropdownOpen(prev => !prev)}
            sx={{ px: 0.5, minWidth: 'auto' }}
          >
            <ArrowDropDown />
          </Button>
        )}
      </ButtonGroup>
      <Popper open={dropdownOpen} anchorEl={anchorRef.current} placement="bottom-end" transition disablePortal sx={{ zIndex: 1300 }}>
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper elevation={4}>
              <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
                <MenuList dense>
                  {activeRoutineNames?.map(id => (
                    <MenuItem
                      key={id}
                      onClick={() => {
                        setDropdownOpen(false);
                        onShowActiveRoutine?.(id);
                      }}
                    >
                      <Terminal sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      {id}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>

      <Button
        startIcon={<Settings />}
        variant="outlined"
        size="small"
        onClick={onShowConfig}
      >
        Config
      </Button>

      <FormControl variant="outlined" size="small" sx={{ minWidth: 110 }}>
        <InputLabel id="log-level-label">Log Level</InputLabel>
        <Select
          labelId="log-level-label"
          value={logLevel}
          onChange={(e) => onLogLevelChange(e.target.value as 'error' | 'warn' | 'info' | 'debug' | 'verbose')}
          label="Log Level"
        >
          <MenuItem value="error">Error</MenuItem>
          <MenuItem value="warn">Warn</MenuItem>
          <MenuItem value="info">Info</MenuItem>
          <MenuItem value="debug">Debug</MenuItem>
          <MenuItem value="verbose">Verbose</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default ServiceActions;
