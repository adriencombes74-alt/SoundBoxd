'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface PullToRefreshProps {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    className?: string;
}

export default function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const pullDistance = useMotionValue(0);

    const THRESHOLD = 80;

    const opacity = useTransform(pullDistance, [0, THRESHOLD], [0, 1]);
    const scale = useTransform(pullDistance, [0, THRESHOLD], [0.5, 1]);
    const rotate = useTransform(pullDistance, [0, THRESHOLD * 2], [0, 360]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!containerRef.current || containerRef.current.scrollTop > 0 || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Apply resistance to the pull
            const resistance = 0.4;
            pullDistance.set(diff * resistance);
        }
    }, [isRefreshing, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance.get() >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);

            // Animate to loading position
            animate(pullDistance, 60, { duration: 0.2 });

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                animate(pullDistance, 0, { duration: 0.3, ease: "easeOut" });
            }
        } else {
            animate(pullDistance, 0, { duration: 0.3, ease: "easeOut" });
        }
        startY.current = 0;
    }, [isRefreshing, onRefresh, pullDistance]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-auto ${className || ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <motion.div
                className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-50"
                style={{
                    top: 80,
                    opacity,
                }}
            >
                <motion.div
                    className="w-10 h-10 rounded-full bg-[#00e054] flex items-center justify-center shadow-lg shadow-green-900/30"
                    style={{ scale, rotate }}
                >
                    {isRefreshing ? (
                        <motion.div
                            className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                        />
                    ) : (
                        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    )}
                </motion.div>
            </motion.div>

            {/* Content wrapper */}
            <motion.div style={{ y: pullDistance }}>
                {children}
            </motion.div>
        </div>
    );
}
