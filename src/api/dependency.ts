import api from "./axios";

export const addDependency = async (taskId: string, dependencyId: string) => {
  const response = await api.post(`/dependencies/${taskId}`, {
    dependencyId,
  });

  return response.data.data.task;
};

export const removeDependency = async (
  taskId: string,
  dependencyId: string,
) => {
  const response = await api.delete(`/dependencies/${taskId}/${dependencyId}`);

  return response.data.data.task;
};
