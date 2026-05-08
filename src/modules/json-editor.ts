/**
 * JSON Editor Module
 *
 * Visual JSON editor for configurations
 */

import { Module } from '../core/module-system/types';
import VisualJSONEditor from '../components/Editors/VisualJSONEditor';

export const jsonEditorModule: Module = {
  metadata: {
    id: 'json-editor',
    name: 'JSON Editor',
    description: 'Visual JSON editor for configurations',
    version: '1.0.0',
    icon: 'Code',
    route: 'json-editor',
    enabled: true,
    order: 70,
    teamSpecific: false,
    dependencies: [],
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[JSONEditor] Module loaded');
    },

    onUnload: async () => {
      console.log('[JSONEditor] Module unloaded');
    },
  },

  component: VisualJSONEditor,

  getBadge: () => null,
};
