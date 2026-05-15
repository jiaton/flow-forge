import React from 'react';
import { Module } from '../core/module-system/types';

const CommandPalette = React.lazy(() => import('../components/CommandPalette/CommandPalette'));

export const commandPaletteModule: Module = {
  metadata: {
    id: 'command-palette',
    name: 'Command Palette',
    description: 'Universal CLI autocomplete and command templates',
    version: '0.1.0',
    icon: 'Terminal',
    route: 'command-palette',
    enabled: true,
    order: 15,
    teamSpecific: false,
    dependencies: [],
  },
  component: CommandPalette,
};
