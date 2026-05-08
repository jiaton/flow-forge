/**
 * Invoice Builder Module
 *
 * Create and manage invoices
 */

import { Module } from '../core/module-system/types';
import InvoiceBuilder from '../components/InvoiceBuilder/InvoiceBuilder';

export const invoiceBuilderModule: Module = {
  metadata: {
    id: 'invoice-builder',
    name: 'Invoice Builder',
    description: 'Create and manage invoices',
    version: '1.0.0',
    icon: 'Receipt',
    route: 'invoice-builder',
    enabled: true,
    order: 40,
    teamSpecific: false,
    dependencies: [],
  },

  lifecycle: {
    onLoad: async () => {
      console.log('[InvoiceBuilder] Module loaded');
    },

    onUnload: async () => {
      console.log('[InvoiceBuilder] Module unloaded');
    },
  },

  component: InvoiceBuilder,

  getBadge: () => null,
};
