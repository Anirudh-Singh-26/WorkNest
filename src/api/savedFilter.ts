import api from "./axios";

export interface SavedFilter {
  _id: string;
  user: string;
  project: string;
  name: string;
  filters: Record<string, any>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getSavedFilters = async (projectId: string) => {
  const response = await api.get(`/saved-filters/project/${projectId}`);

  return response.data.data.filters as SavedFilter[];
};

export const createSavedFilter = async (
  projectId: string,
  name: string,
  filters: Record<string, any>,
) => {
  const response = await api.post(`/saved-filters/project/${projectId}`, {
    name,
    filters,
  });

  return response.data.data.filter as SavedFilter;
};

export const updateSavedFilter = async (
  filterId: string,
  data: {
    name?: string;
    filters?: Record<string, any>;
    isDefault?: boolean;
  },
) => {
  const response = await api.patch(`/saved-filters/${filterId}`, data);

  return response.data.data.filter as SavedFilter;
};

export const deleteSavedFilter = async (filterId: string) => {
  await api.delete(`/saved-filters/${filterId}`);
};
