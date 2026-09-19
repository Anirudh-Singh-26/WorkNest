export interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
  };
}
