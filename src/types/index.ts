export type CheckState = "checked" | "unchecked" | "indeterminate";

export type OutputFormat = "plain" | "markdown" | "xml";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
  size: number;
  extension: string;
}

export interface AppConfig {
  last_directories: string[];
  ignore_list: string[];
  extension_filter: string[];
  prompt_prefix: string;
  prompt_suffix: string;
}

export interface SelectionPreset {
  id: string;
  name: string;
  paths: string[];
  createdAt: number;
}
