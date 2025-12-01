"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermission(Notification.permission);

            // Check if already subscribed
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.pushManager.getSubscription().then((subscription) => {
                        setIsSubscribed(!!subscription);
                    });
                });
            }
        }
    }, []);

    const subscribe = useCallback(async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            toast.error("Push notifications are not supported in this browser");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Request permission
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== "granted") {
                toast.error("Permission denied");
                setIsLoading(false);
                return;
            }

            // 2. Register Service Worker
            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            // 3. Get VAPID Public Key
            const { publicKey } = await apiClient.get<{ publicKey: string }>("/push/vapid-public-key");

            if (!publicKey) {
                throw new Error("Failed to get VAPID key");
            }

            // 4. Subscribe to PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            // 5. Send subscription to backend (convert to JSON)
            await apiClient.post("/push/subscribe", { subscription: subscription.toJSON() });

            setIsSubscribed(true);
            toast.success("Notifications enabled!");
        } catch (error) {
            console.error("Failed to subscribe to push notifications:", error);
            toast.error("Failed to enable notifications");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            return;
        }

        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                setIsSubscribed(false);
                toast.success("Notifications disabled");
            }
        } catch (error) {
            console.error("Failed to unsubscribe from push notifications:", error);
            toast.error("Failed to disable notifications");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    };
}
