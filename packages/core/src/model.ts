export type FindingLevel = 'critical' | 'warning' | 'info';

export interface FileInfo {
  path: string;
  lines: number;
  hash: string;
  isClient: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  entry: string;
  files: string[];
  tables: { name: string; access: 'read' | 'write' }[];
  apis: string[];
}

export interface Finding {
  checkId: string;
  level: FindingLevel;
  file: string;
  line?: number;
  message: string;
  fixPrompt: string;
  featureId?: string;
}

export interface ProjectModel {
  createdAt: string;
  gitCommit?: string;
  stack: { framework: 'next-app'; db?: 'supabase' };
  files: FileInfo[];
  imports: [from: string, to: string][];
  pages: { route: string; file: string }[];
  apis: { route: string; file: string; methods: string[] }[];
  tables: { name: string; rls: boolean; usedIn: string[] }[];
  envVars: { name: string; public: boolean; usedIn: string[] }[];
  dependencies: Record<string, string>;
  features: Feature[];
  findings: Finding[];
  health: number;
}
