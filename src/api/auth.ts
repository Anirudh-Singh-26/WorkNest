import api from "./axios";
import type { AuthResponse, User } from "../types/auth";

export const loginUser = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
  });

  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<AuthResponse>("/auth/me");

  return response.data.data!.user;
};

export const refreshSession = async () => {
  await api.post("/auth/refresh");
};

export const logoutUser = async () => {
  await api.post("/auth/logout");
};
