import { vi } from 'vitest';

globalThis.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 0) as unknown as number);
globalThis.cancelAnimationFrame = vi.fn((id) => clearTimeout(id as unknown as NodeJS.Timeout));

vi.mock('svelte/transition', () => ({
    fade: () => ({}),
    slide: () => ({}),
    blur: () => ({}),
    fly: () => ({}),
    scale: () => ({}),
    draw: () => ({}),
    crossfade: () => [() => ({}), () => ({})]
}));
