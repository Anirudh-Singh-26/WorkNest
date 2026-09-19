import api from "./axios";

export interface Workspace {
  _id: string;
  name: string;
  owner: string;
  members: {
    user: string;
    role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
  }[];
  createdAt: string;
  updatedAt: string;
}

export const getWorkspaces = async () => {
  const response = await api.get("/workspaces");
  return response.data.data.workspaces;
};

export const getWorkspace = async (workspaceId: string) => {
  const response = await api.get(`/workspaces/${workspaceId}`);
  return response.data.data.workspace;
};

export const createWorkspace = async (name: string) => {
  const response = await api.post("/workspaces", { name });
  return response.data.data.workspace;
};

export const addWorkspaceMember = async (
  workspaceId: string,
  email: string,
  role: "MEMBER" | "MANAGER" | "ADMIN" | "VIEWER" = "MEMBER",
) => {
  const response = await api.post(`/workspaces/${workspaceId}/members`, {
    email,
    role,
  });

  return response.data.data.workspace;
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  userId: string,
) => {
  const response = await api.delete(
    `/workspaces/${workspaceId}/members/${userId}`,
  );

  return response.data.data.workspace;
};

export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  userId: string,
  role: "MEMBER" | "MANAGER" | "ADMIN" | "VIEWER",
) => {
  const response = await api.patch(
    `/workspaces/${workspaceId}/members/${userId}`,
    { role },
  );

  return response.data.data.workspace;
};