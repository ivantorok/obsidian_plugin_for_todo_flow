import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShakeDetector } from '../utils/ShakeDetector.js';

describe('ShakeDetector (TDD)', () => {
    let onShake: ReturnType<typeof vi.fn>;
    let detector: ShakeDetector;

    beforeEach(() => {
        onShake = vi.fn();
        detector = new ShakeDetector(onShake as any, { threshold: 15, cooldown: 100 });
    });

    it('should detect a shake when acceleration exceeds threshold', () => {
        // High acceleration
        detector.handleMotion({
            acceleration: { x: 20, y: 0, z: 0 },
            accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            interval: 16
        } as DeviceMotionEvent);

        expect(onShake).toHaveBeenCalled();
    });

    it('should NOT detect a shake when acceleration is below threshold', () => {
        detector.handleMotion({
            acceleration: { x: 5, y: 5, z: 5 },
            accelerationIncludingGravity: { x: 5, y: 5, z: 5 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            interval: 16
        } as DeviceMotionEvent);

        expect(onShake).not.toHaveBeenCalled();
    });

    it('should respect cooldown to prevent multiple triggers', () => {
        // First shake
        detector.handleMotion({
            acceleration: { x: 30, y: 0, z: 0 },
            accelerationIncludingGravity: { x: 30, y: 0, z: 0 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            interval: 16
        } as DeviceMotionEvent);

        // Immediate second shake (within 100ms cooldown)
        detector.handleMotion({
            acceleration: { x: 30, y: 0, z: 0 },
            accelerationIncludingGravity: { x: 30, y: 0, z: 0 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            interval: 16
        } as DeviceMotionEvent);

        expect(onShake).toHaveBeenCalledTimes(1);
    });

    it('should allow shake again after cooldown', async () => {
        detector.handleMotion({
            acceleration: { x: 30, y: 0, z: 0 },
            accelerationIncludingGravity: { x: 30, y: 0, z: 0 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            interval: 16
        } as DeviceMotionEvent);

        // Wait for cooldown
        await new Promise(r => setTimeout(r, 150));

        detector.handleMotion({
            acceleration: { x: 30, y: 0, z: 0 },
            accelerationIncludingGravity: { x: 30, y: 0, z: 0 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            interval: 16
        } as DeviceMotionEvent);

        expect(onShake).toHaveBeenCalledTimes(2);
    });
});
