import React, { useState, useEffect, useCallback } from 'react';
import { Notification } from '@mantine/core';
import { IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';

interface AppNotification {
  id: string;
  title?: string;
  message: string;
  c?: string; // Mantine color prop
  icon?: React.ReactNode;
  autoClose?: number | false;
}

let showNotificationRef: ((notification: Omit<AppNotification, 'id'>) => void) | null = null;

export const showAppNotification = (notification: Omit<AppNotification, 'id'>) => {
  if (showNotificationRef) {
    showNotificationRef(notification);
  }
};

export function NotificationDisplay() {
  const [notification, setNotification] = useState<AppNotification | null>(null);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    showNotificationRef = (newNotification) => {
      setNotification({
        id: Date.now().toString(), // Unique ID for key
        ...newNotification,
      });
    };

    return () => {
      showNotificationRef = null;
    };
  }, []);

  useEffect(() => {
    if (notification && notification.autoClose !== false) {
      const timer = setTimeout(() => {
        dismissNotification();
      }, notification.autoClose || 5000); // Default autoClose to 5 seconds
      return () => clearTimeout(timer);
    }
  }, [notification, dismissNotification]);

  if (!notification) {
    return null;
  }

  let icon = <IconInfoCircle size={18} />;
  if (notification.c === 'green') {
    icon = <IconCheck size={18} />;
  } else if (notification.c === 'red') {
    icon = <IconX size={18} />;
  }

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
      <Notification
        icon={notification.icon || icon}
        title={notification.title}
        c={notification.c}
        onClose={dismissNotification}
        withCloseButton
        style={{
          minWidth: 300,
          maxWidth: 400,
          // boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        {notification.message}
      </Notification>
    </div>
  );
}
