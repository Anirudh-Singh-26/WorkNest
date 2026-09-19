import api from "./axios";

export interface Notification {
  _id: string;
  recipient: string;
  actor?:
    | {
        _id: string;
        name: string;
        email: string;
      }
    | string;
  type: string;
  message: string;
  entityType?: string;
  entityId?: string;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getNotifications = async (
  page = 1,
  limit = 20,
): Promise<NotificationResponse> => {
  const response = await api.get("/notifications", {
    params: {
      page,
      limit,
    },
  });

  return response.data.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);

  return response.data.data.notification;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch("/notifications/read-all");

  return response.data;
};
