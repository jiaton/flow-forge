/**
 * Flow Visualizer Module
 *
 * Visualize API flows and system architecture
 */

import { Module } from '../core/module-system/types';
import FlowVisualizer from '../components/FlowVisualizer/FlowVisualizer';

export const flowVisualizerModule: Module = {
  metadata: {
    id: 'flow-visualizer',
    name: 'Flow Visualizer',
    description: 'Visualize API flows and system architecture',
    version: '1.0.0',
    icon: 'AccountTree',
    route: 'flow-visualizer',
    enabled: true,
    order: 50,
    teamSpecific: false,
    dependencies: [],
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[FlowVisualizer] Module loaded');
    },

    onUnload: async () => {
      console.log('[FlowVisualizer] Module unloaded');
    },
  },

  component: FlowVisualizer,

  getBadge: () => null,
};
