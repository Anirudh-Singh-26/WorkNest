import { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../socket/socket";
import { useAuth } from "./AuthContext";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from "../api/notification";

interface SocketContextType {
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  const [connected, setConnected] = useState(socket.connected);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      socket.disconnect();
      setConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const loadNotifications = async () => {
      try {
        const data = await getNotifications(1, 20);

        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleConnectError = () => {
      setConnected(false);
    };

    const handleNewNotification = (notification: Notification) => {
      setNotifications((previous) => {
        const alreadyExists = previous.some(
          (item) => item._id === notification._id,
        );

        if (alreadyExists) {
          return previous;
        }

        return [notification, ...previous];
      });

      setUnreadCount((previous) => previous + 1);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("notification.created", handleNewNotification);

    socket.connect();
    loadNotifications();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("notification.created", handleNewNotification);
    };
  }, [user, loading]);

  const markAsRead = async (notificationId: string) => {
    try {
      const currentNotification = notifications.find(
        (notification) => notification._id === notificationId,
      );

      const updatedNotification = await markNotificationAsRead(notificationId);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? updatedNotification
            : notification,
        ),
      );

      if (currentNotification && !currentNotification.readAt) {
        setUnreadCount((previous) => Math.max(previous - 1, 0));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          readAt: new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        connected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
};
