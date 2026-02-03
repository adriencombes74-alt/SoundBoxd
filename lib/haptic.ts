/**
 * Haptic Feedback Utility
 * Provides vibration feedback on mobile devices only
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [10, 50, 20],
    warning: [20, 100, 20],
    error: [50, 100, 50, 100, 50]
};

/**
 * Check if device is mobile
 */
const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
};

/**
 * Check if Vibration API is supported
 */
const isVibrationSupported = (): boolean => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Trigger haptic feedback
 * Only works on mobile devices with vibration support
 */
export const haptic = (style: HapticStyle = 'light'): void => {
    if (!isMobile() || !isVibrationSupported()) return;

    try {
        const pattern = HAPTIC_PATTERNS[style];
        navigator.vibrate(pattern);
    } catch (error) {
        // Silently fail if vibration is not available
        console.debug('Haptic feedback not available');
    }
};

/**
 * Haptic feedback for specific interactions
 */
export const hapticLike = () => haptic('success');
export const hapticTap = () => haptic('light');
export const hapticScroll = () => haptic('light');
export const hapticMenu = () => haptic('medium');
export const hapticError = () => haptic('error');
export const hapticWarning = () => haptic('warning');

export default haptic;
