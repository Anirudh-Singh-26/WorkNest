import api from "./axios";

export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
}

export interface Project {
  _id: string;
  workspace: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export const getProjects = async (workspaceId: string) => {
  const response = await api.get(`/projects/workspace/${workspaceId}`);

  return response.data.data.projects;
};

export const getProject = async (workspaceId: string, projectId: string) => {
  const response = await api.get(
    `/projects/workspace/${workspaceId}/${projectId}`,
  );

  return response.data.data.project;
};

export const createProject = async (
  workspaceId: string,
  data: CreateProjectData,
) => {
  const response = await api.post(`/projects/workspace/${workspaceId}`, data);

  return response.data.data.project;
};

export const updateProject = async (
  workspaceId: string,
  projectId: string,
  data: Partial<CreateProjectData>,
) => {
  const response = await api.patch(
    `/projects/workspace/${workspaceId}/${projectId}`,
    data,
  );

  return response.data.data.project;
};

export const archiveProject = async (
  workspaceId: string,
  projectId: string,
) => {
  const response = await api.patch(
    `/projects/workspace/${workspaceId}/${projectId}/archive`,
  );

  return response.data;
};

export const addProjectMember = async (
  workspaceId: string,
  projectId: string,
  userId: string,
) => {
  const response = await api.post(
    `/projects/workspace/${workspaceId}/${projectId}/members`,
    { userId },
  );

  return response.data.data.project;
};

export const removeProjectMember = async (
  workspaceId: string,
  projectId: string,
  userId: string,
) => {
  const response = await api.delete(
    `/projects/workspace/${workspaceId}/${projectId}/members/${userId}`,
  );

  return response.data.data.project;
};