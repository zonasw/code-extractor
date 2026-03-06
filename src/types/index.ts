export type CheckState = "checked" | "unchecked" | "indeterminate";

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
}
