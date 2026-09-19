import api from "./axios";

export interface CommentUser {
  _id: string;
  name: string;
  email: string;
}

export interface Comment {
  _id: string;
  task: string;
  author: CommentUser;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export const getComments = async (taskId: string) => {
  const response = await api.get(`/comments/task/${taskId}`);

  return response.data.data.comments;
};

export const createComment = async (taskId: string, body: string) => {
  const response = await api.post(`/comments/task/${taskId}`, {
    body,
  });

  return response.data.data.comment;
};

export const updateComment = async (commentId: string, body: string) => {
  const response = await api.patch(`/comments/${commentId}`, {
    body,
  });

  return response.data.data.comment;
};

export const deleteComment = async (commentId: string) => {
  const response = await api.delete(`/comments/${commentId}`);

  return response.data.data.comment;
};
