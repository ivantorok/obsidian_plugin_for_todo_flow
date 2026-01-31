export const SWIPE_THRESHOLD = 80;
export const DOUBLE_TAP_WINDOW = 300;

export function resolveSwipe(deltaX: number): 'right' | 'left' | 'none' {
    if (deltaX > SWIPE_THRESHOLD) return 'right';
    if (deltaX < -SWIPE_THRESHOLD) return 'left';
    return 'none';
}

export function isDoubleTap(lastTapTime: number, currentTapTime: number): boolean {
    return (currentTapTime - lastTapTime) < DOUBLE_TAP_WINDOW;
}
