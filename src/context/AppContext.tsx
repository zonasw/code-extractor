import React, { createContext, useContext, useReducer, Dispatch } from "react";
import { FileNode, AppConfig } from "@/types";

interface AppState {
  rootNodes: FileNode[];
  selectedPaths: Set<string>;
  config: AppConfig;
  previewContent: string | null;
  isLoading: boolean;
}

type AppAction =
  | { type: "ADD_ROOT_NODE"; payload: FileNode }
  | { type: "REMOVE_ROOT_NODE"; payload: string }   // payload = root path
  | { type: "REPLACE_ROOT_NODE"; payload: FileNode } // refresh: replace by path
  | { type: "SET_SELECTED_PATHS"; payload: Set<string> }
  | { type: "ADD_SELECTED_PATHS"; payload: string[] }
  | { type: "REMOVE_SELECTED_PATHS"; payload: string[] }
  | { type: "ADD_SELECTED_PATH"; payload: string }
  | { type: "REMOVE_SELECTED_PATH"; payload: string }
  | { type: "SET_CONFIG"; payload: AppConfig }
  | { type: "SET_PREVIEW_CONTENT"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean };

const defaultConfig: AppConfig = {
  last_directories: [],
  ignore_list: [
    "node_modules", ".git", "__pycache__", "dist", "build",
    ".next", ".nuxt", "target", ".idea", ".vscode",
    "vendor", ".DS_Store", "coverage",
  ],
  extension_filter: [],
};

const initialState: AppState = {
  rootNodes: [],
  selectedPaths: new Set(),
  config: defaultConfig,
  previewContent: null,
  isLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_ROOT_NODE":
      // avoid duplicates
      if (state.rootNodes.some((n) => n.path === action.payload.path)) {
        return { ...state, rootNodes: state.rootNodes.map((n) => n.path === action.payload.path ? action.payload : n) };
      }
      return { ...state, rootNodes: [...state.rootNodes, action.payload] };
    case "REMOVE_ROOT_NODE": {
      const removed = state.rootNodes.find((n) => n.path === action.payload);
      if (!removed) return state;
      // also deselect all children of removed root
      const toRemove = new Set(collectAllPaths(removed));
      const next = new Set(state.selectedPaths);
      toRemove.forEach((p) => next.delete(p));
      return {
        ...state,
        rootNodes: state.rootNodes.filter((n) => n.path !== action.payload),
        selectedPaths: next,
      };
    }
    case "REPLACE_ROOT_NODE":
      return {
        ...state,
        rootNodes: state.rootNodes.map((n) =>
          n.path === action.payload.path ? action.payload : n
        ),
      };
    case "SET_SELECTED_PATHS":
      return { ...state, selectedPaths: action.payload };
    case "ADD_SELECTED_PATHS": {
      const next = new Set(state.selectedPaths);
      action.payload.forEach((p) => next.add(p));
      return { ...state, selectedPaths: next };
    }
    case "REMOVE_SELECTED_PATHS": {
      const next = new Set(state.selectedPaths);
      action.payload.forEach((p) => next.delete(p));
      return { ...state, selectedPaths: next };
    }
    case "ADD_SELECTED_PATH": {
      const next = new Set(state.selectedPaths);
      next.add(action.payload);
      return { ...state, selectedPaths: next };
    }
    case "REMOVE_SELECTED_PATH": {
      const next = new Set(state.selectedPaths);
      next.delete(action.payload);
      return { ...state, selectedPaths: next };
    }
    case "SET_CONFIG":
      return { ...state, config: action.payload };
    case "SET_PREVIEW_CONTENT":
      return { ...state, previewContent: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

function collectAllPaths(node: FileNode): string[] {
  if (!node.is_dir) return [node.path];
  return node.children.flatMap(collectAllPaths);
}

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
