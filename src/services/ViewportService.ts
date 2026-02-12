
/**
 * ViewportService
 * Handles complex viewport-aware interactions, especially for mobile 
 * where virtual keyboards and system bars can obscure content.
 */
export class ViewportService {
    /**
     * Ensures the element is centered in the visible viewport.
     * On mobile, this accounts for the virtual keyboard by forcing a 
     * secondary scroll after the keyboard layout shift is likely complete.
     */
    static scrollIntoView(el: HTMLElement | null, behavior: ScrollBehavior = 'smooth', block: ScrollLogicalPosition = 'center') {
        if (!el) return;

        // Native scroll first
        el.scrollIntoView({ block, behavior });

        // Mobile hardening: The keyboard layout shift often happens AFTER focus.
        // We trigger a second pass to ensure it STAYS visible/centered.
        if (this.isMobile()) {
            setTimeout(() => {
                if (el && document.body.contains(el)) {
                    el.scrollIntoView({ block, behavior });
                }
            }, 400); // Increased to 400ms for more stable keyboard transition
        }
    }

    private static isMobile(): boolean {
        // Check Obsidian's internal flag if available, fallback to UA
        if (typeof window !== 'undefined' && (window as any).app?.isMobile) return true;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}
