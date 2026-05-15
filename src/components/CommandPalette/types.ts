export interface CommandFlag {
  name: string;        // e.g. "--staged"
  shortFlag?: string;  // e.g. "-s"
  description: string;
}

export interface CommandEntry {
  name: string;
  description: string;
  subcommands?: CommandEntry[];
  flags?: CommandFlag[];
}

export interface CommandCache {
  binary: string;
  version: string;
  description?: string;
  helpFlag: string;
  versionFlag: string;
  parser: {
    commandPattern: string;
    sectionPattern?: string;
    stopPattern?: string;
  };
  commands: CommandEntry[];
}

export interface RegisteredCommand {
  binary: string;
  helpFlag: string;
  versionFlag: string;
}

export interface TemplateVariable {
  prompt: string;
  default: string;
  repeat?: boolean;  // can appear multiple times (e.g., -p project:branch pairs)
}

export interface TemplateVersion {
  name: string;                                    // e.g., "CIN-8218 feature"
  values: Record<string, string | string[]>;       // pre-filled variable values
}

export interface CommandTemplate {
  id: string;                                      // unique identifier
  name: string;                                    // display name
  command: string;                                 // command with ${VAR} placeholders
  variables?: Record<string, TemplateVariable>;    // variable definitions
  versions?: TemplateVersion[];                    // saved presets for this template
}

export interface CommandPaletteConfig {
  commands: RegisteredCommand[];
  templates: CommandTemplate[];
}

export interface AutocompleteOption {
  label: string;
  description: string;
  path: string[]; // breadcrumb: ['gh', 'pr', 'create']
}
