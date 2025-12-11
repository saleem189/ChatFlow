// ================================
// Call Notifications Utility
// ================================
// Browser notifications and ringtone for incoming calls
// Uses existing permissions system from lib/permissions

import { browserPermissions } from "@/lib/permissions";

/**
 * Request notification permission from browser
 * Uses existing permission system
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const status = await browserPermissions.request('notifications');
    return status.state === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Show browser notification for incoming call
 */
export function showCallNotification(
  callerName: string,
  callType: "video" | "audio",
  onAccept?: () => void,
  onDecline?: () => void
): Notification | null {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  const notification = new Notification(
    `Incoming ${callType === "video" ? "Video" : "Audio"} Call`,
    {
      body: `${callerName} is calling you`,
      icon: "/icons/call-icon.png", // Add your app icon
      badge: "/icons/call-badge.png", // Add your badge icon
      tag: "incoming-call",
      requireInteraction: true, // Keep notification until user interacts
      // @ts-ignore - vibrate is supported in browsers but not in TypeScript types
      vibrate: [200, 100, 200], // Vibration pattern for mobile
      // @ts-ignore - actions are supported but may not be in all TypeScript versions
      actions: [
        { action: "accept", title: "Accept" },
        { action: "decline", title: "Decline" },
      ],
    }
  );

  // Handle notification actions (note: actions may not work in all browsers)
  notification.onclick = () => {
    window.focus();
    onAccept?.();
    notification.close();
  };

  return notification;
}

/**
 * Play ringtone for incoming call
 */
export class CallRingtone {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor(ringtoneUrl?: string) {
    if (typeof window !== "undefined") {
      this.audio = new Audio(ringtoneUrl || "/sounds/ringtone.mp3"); // Add your ringtone file
      this.audio.loop = true;
      this.audio.volume = 0.5;
    }
  }

  async play(): Promise<void> {
    if (!this.audio || this.isPlaying) return;

    try {
      await this.audio.play();
      this.isPlaying = true;
    } catch (error) {
      console.warn("Failed to play ringtone:", error);
    }
  }

  stop(): void {
    if (!this.audio || !this.isPlaying) return;

    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

/**
 * Create and manage ringtone instance
 */
let ringtoneInstance: CallRingtone | null = null;

export function getCallRingtone(): CallRingtone {
  if (!ringtoneInstance) {
    ringtoneInstance = new CallRingtone();
  }
  return ringtoneInstance;
}

/**
 * Show incoming call notification with ringtone
 */
export async function notifyIncomingCall(
  callerName: string,
  callType: "video" | "audio",
  onAccept?: () => void,
  onDecline?: () => void
): Promise<{ notification: Notification | null; stopRingtone: () => void }> {
  // Request permission if not already granted
  const hasPermission = await requestNotificationPermission();

  // Show notification
  const notification = hasPermission
    ? showCallNotification(callerName, callType, onAccept, onDecline)
    : null;

  // Play ringtone
  const ringtone = getCallRingtone();
  await ringtone.play();

  return {
    notification,
    stopRingtone: () => {
      ringtone.stop();
      notification?.close();
    },
  };
}

