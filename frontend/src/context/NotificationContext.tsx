"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

// ─── Types ───

export type NotificationType = "trade" | "security" | "course" | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: NotificationType, title: string, description: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  // Toast queue (latest unread notifications shown as toasts)
  toastQueue: Notification[];
  dismissToast: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// ─── Storage helpers ───

function storageKey(email: string) {
  return `chartcoach_notifications_${email}`;
}

function loadFromStorage(email: string): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(email: string, notifications: Notification[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep only the last 50 notifications
    localStorage.setItem(storageKey(email), JSON.stringify(notifications.slice(0, 50)));
  } catch {
    // Ignore
  }
}

// ─── Provider ───

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);

  // Load persisted notifications when user changes
  useEffect(() => {
    if (user?.email) {
      setNotifications(loadFromStorage(user.email));
    } else {
      setNotifications([]);
    }
    setToastQueue([]);
  }, [user?.email]);

  // Persist whenever notifications change
  useEffect(() => {
    if (user?.email && notifications.length > 0) {
      saveToStorage(user.email, notifications);
    }
  }, [notifications, user?.email]);

  const addNotification = useCallback(
    (type: NotificationType, title: string, description: string) => {
      const newNotif: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        title,
        description,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      setToastQueue((prev) => [newNotif, ...prev].slice(0, 3));
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (user?.email) {
      try {
        localStorage.removeItem(storageKey(user.email));
      } catch {
        // Ignore
      }
    }
  }, [user?.email]);

  const dismissToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        dismiss,
        clearAll,
        toastQueue,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside a NotificationProvider");
  }
  return context;
}
