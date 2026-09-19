import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getWorkspaces, createWorkspace } from "../api/workspace";

import type { Workspace } from "../api/workspace";
import { useAuth } from "./AuthContext";

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  addWorkspace: (name: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] =
    useState<Workspace | null>(null);

  const [loading, setLoading] = useState(true);

  const getStorageKey = () => {
    if (!user?._id) return null;

    return `fixl:selectedWorkspace:${user._id}`;
  };

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);

    const storageKey = getStorageKey();

    if (storageKey) {
      localStorage.setItem(storageKey, workspace._id);
    }
  };

  const refreshWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getWorkspaces();

      setWorkspaces(data);

      if (data.length === 0) {
        setCurrentWorkspaceState(null);

        const storageKey = getStorageKey();

        if (storageKey) {
          localStorage.removeItem(storageKey);
        }

        return;
      }

      const storageKey = getStorageKey();
      const savedWorkspaceId = storageKey
        ? localStorage.getItem(storageKey)
        : null;

      setCurrentWorkspaceState((previousWorkspace) => {
        if (previousWorkspace) {
          const updatedWorkspace = data.find(
            (workspace: { _id: string; }) => workspace._id === previousWorkspace._id,
          );

          if (updatedWorkspace) {
            return updatedWorkspace;
          }
        }

        if (savedWorkspaceId) {
          const savedWorkspace = data.find(
            (workspace: { _id: string; }) => workspace._id === savedWorkspaceId,
          );

          if (savedWorkspace) {
            return savedWorkspace;
          }
        }

        return data[0];
      });

      if (storageKey && !savedWorkspaceId && data[0]) {
        localStorage.setItem(storageKey, data[0]._id);
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setLoading(false);
      return;
    }

    refreshWorkspaces();
  }, [authLoading, user?._id]);

  const addWorkspace = async (name: string) => {
    const workspace = await createWorkspace(name);

    setWorkspaces((previous) => [workspace, ...previous]);

    setCurrentWorkspaceState(workspace);

    const storageKey = getStorageKey();

    if (storageKey) {
      localStorage.setItem(storageKey, workspace._id);
    }

    return workspace;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        setCurrentWorkspace,
        refreshWorkspaces,
        addWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
};
