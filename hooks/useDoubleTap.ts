'use client';

import { useCallback, useRef } from 'react';

interface UseDoubleTapOptions {
    onSingleTap?: () => void;
    onDoubleTap: () => void;
    delay?: number;
}

/**
 * Hook to detect double tap vs single tap
 * Delays single tap to allow double tap detection
 */
export function useDoubleTap({ onSingleTap, onDoubleTap, delay = 300 }: UseDoubleTapOptions) {
    const tapCount = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);

    const handleTap = useCallback(() => {
        tapCount.current += 1;

        if (tapCount.current === 1) {
            // First tap - wait to see if there's a second
            tapTimer.current = setTimeout(() => {
                if (tapCount.current === 1 && onSingleTap) {
                    onSingleTap();
                }
                tapCount.current = 0;
            }, delay);
        } else if (tapCount.current === 2) {
            // Double tap detected
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
            }
            onDoubleTap();
            tapCount.current = 0;
        }
    }, [onSingleTap, onDoubleTap, delay]);

    return handleTap;
}

export default useDoubleTap;
