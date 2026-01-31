export interface ShakeOptions {
    threshold: number;
    cooldown: number;
}

/**
 * Utility to detect "Shake to Undo" gestures using DeviceMotionEvent
 */
export class ShakeDetector {
    private lastShake: number = 0;
    private options: ShakeOptions;
    private onShake: () => void;

    constructor(onShake: () => void, options: Partial<ShakeOptions> = {}) {
        this.onShake = onShake;
        this.options = {
            threshold: options.threshold ?? 15, // m/s^2
            cooldown: options.cooldown ?? 1000,   // ms
        };
    }

    /**
     * Handle DeviceMotionEvent from the window
     * We use 'acceleration' which excludes gravity for cleaner detection
     */
    handleMotion(e: DeviceMotionEvent) {
        const acc = e.acceleration;
        if (!acc) return;

        const { x, y, z } = acc;
        if (x === null || y === null || z === null) return;

        // Calculate total acceleration magnitude
        // sqrt(x^2 + y^2 + z^2)
        const totalAcc = Math.sqrt(x * x + y * y + z * z);

        if (totalAcc > this.options.threshold) {
            const now = Date.now();
            if (now - this.lastShake > this.options.cooldown) {
                this.lastShake = now;
                this.onShake();
            }
        }
    }

    /**
     * Start listening for motion events on the window
     * Note: iOS requires permission request before this works
     */
    start() {
        window.addEventListener('devicemotion', this.handleMotion.bind(this));
    }

    /**
     * Stop listening
     */
    stop() {
        window.removeEventListener('devicemotion', this.handleMotion.bind(this));
    }

    /**
     * Static helper to check if permission is needed (iOS 13+)
     */
    static needsPermissionRequest(): boolean {
        return typeof (DeviceMotionEvent as any).requestPermission === 'function';
    }

    /**
     * Static helper to request permission
     * MUST be called from a user gesture (ui click)
     */
    static async requestPermission(): Promise<boolean> {
        if (this.needsPermissionRequest()) {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                return response === 'granted';
            } catch (error) {
                console.error('[ShakeDetector] Permission request failed:', error);
                return false;
            }
        }
        return true; // Not required on Android/Linux/etc
    }
}
