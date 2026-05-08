// Environment constants to ensure consistency across the application

// Full environment names (used in config files and APIs)
export const ENVIRONMENT_NAMES = {
  PRODUCTION: 'production',
  STAGING: 'staging', 
  DEVELOPMENT: 'development',
  APPTEST: 'apptest',
  LOCAL: 'local',
} as const;

// Short environment names (used in UI and URLs)
export const ENVIRONMENT_SHORT_NAMES = {
  PRODUCTION: 'prod',
  STAGING: 'stage',
  DEVELOPMENT: 'dev',
  APPTEST: 'apptest',
  LOCAL: 'local',
} as const;

// All possible environment values for UI
export const UI_ENVIRONMENTS = [
  ENVIRONMENT_SHORT_NAMES.LOCAL,
  ENVIRONMENT_SHORT_NAMES.DEVELOPMENT,
  ENVIRONMENT_SHORT_NAMES.APPTEST,
  ENVIRONMENT_SHORT_NAMES.STAGING,
  ENVIRONMENT_SHORT_NAMES.PRODUCTION,
] as const;

// Environment mapping function
export const getEnvironmentShortName = (environment: string): string => {
  switch (environment) {
    case ENVIRONMENT_NAMES.PRODUCTION:
      return ENVIRONMENT_SHORT_NAMES.PRODUCTION;
    case ENVIRONMENT_NAMES.STAGING:
      return ENVIRONMENT_SHORT_NAMES.STAGING;
    case ENVIRONMENT_NAMES.DEVELOPMENT:
      return ENVIRONMENT_SHORT_NAMES.DEVELOPMENT;
    case ENVIRONMENT_NAMES.APPTEST:
      return ENVIRONMENT_SHORT_NAMES.APPTEST;
    default:
      return ENVIRONMENT_SHORT_NAMES.LOCAL;
  }
};

// Environment type definitions
export type FullEnvironment = typeof ENVIRONMENT_NAMES[keyof typeof ENVIRONMENT_NAMES];
export type ShortEnvironment = typeof ENVIRONMENT_SHORT_NAMES[keyof typeof ENVIRONMENT_SHORT_NAMES];
export type UIEnvironment = typeof UI_ENVIRONMENTS[number];

// Environment validation
export const isValidEnvironment = (env: string): env is FullEnvironment => {
  return Object.values(ENVIRONMENT_NAMES).includes(env as FullEnvironment);
};

export const isValidUIEnvironment = (env: string): env is UIEnvironment => {
  return UI_ENVIRONMENTS.includes(env as UIEnvironment);
};

// Environment styling helpers
export const getEnvironmentColor = (env: string): 'error' | 'warning' | 'success' => {
  switch (env) {
    case ENVIRONMENT_SHORT_NAMES.PRODUCTION:
      return 'error';
    case ENVIRONMENT_SHORT_NAMES.STAGING:
    case ENVIRONMENT_SHORT_NAMES.APPTEST:
      return 'warning';
    default:
      return 'success';
  }
};

export const getEnvironmentBorderColor = (env: string): string => {
  switch (env) {
    case ENVIRONMENT_SHORT_NAMES.PRODUCTION:
      return '#f44336';
    case ENVIRONMENT_SHORT_NAMES.STAGING:
    case ENVIRONMENT_SHORT_NAMES.APPTEST:
      return '#ff9800';
    default:
      return '#4caf50';
  }
};

export const getEnvironmentBackgroundColor = (env: string): string => {
  switch (env) {
    case ENVIRONMENT_SHORT_NAMES.PRODUCTION:
      return '#ffebee';
    case ENVIRONMENT_SHORT_NAMES.STAGING:
    case ENVIRONMENT_SHORT_NAMES.APPTEST:
      return '#fff3e0';
    default:
      return '#e8f5e8';
  }
};