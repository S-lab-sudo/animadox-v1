
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const register = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            return register;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    return null;
}

export async function subscribeToPush() {
    if (!publicVapidKey) {
        throw new Error('VAPID public key not found');
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
        throw new Error('Service Worker not ready');
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    return subscription;
}
