export const PATCH_SOURCE = {
  PERSONAL: 'personal',
  TEAM: 'team',
} as const;

export type PatchSource = typeof PATCH_SOURCE[keyof typeof PATCH_SOURCE];
