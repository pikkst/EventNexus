import { useEffect, useCallback, useState } from 'react';

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Hook for managing Web Push Notifications
 * Requests permission and provides notification utilities
 */
export const useWebNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Send a notification
  const sendNotification = useCallback(
    (options: PushNotificationOptions) => {
      if (!isSupported || permission !== 'granted') {
        return null;
      }

      try {
        // Try to use service worker for background notifications
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            options: {
              ...options,
              tag: options.tag || 'EventNexus',
              badge: options.badge || '/favicon.ico',
            },
          });
        } else {
          // Fallback to direct notification
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            badge: options.badge || '/favicon.ico',
            tag: options.tag || 'EventNexus',
            requireInteraction: options.requireInteraction || false,
          });
        }
        return true;
      } catch (error) {
        console.error('Failed to send notification:', error);
        return false;
      }
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    isGranted: permission === 'granted',
  };
};
