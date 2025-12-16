"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxRotation?: number; // Degré max de rotation (ex: 15)
  scale?: number; // Scale au survol (ex: 1.05)
}

export default function TiltCard({ 
  children, 
  className = "", 
  maxRotation = 15,
  scale = 1.05
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Valeurs de mouvement
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Physique du mouvement (Spring) pour fluidité
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

  // Transformation en rotation
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [maxRotation, -maxRotation]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-maxRotation, maxRotation]);

  // Brillance (Glare) qui suit la souris
  const glareX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useTransform(mouseX, [-0.5, 0.5], [0, 0.4]); // Opacité max au bord

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Position de la souris relative au centre de la carte (-0.5 à 0.5)
    const mouseXPos = (e.clientX - rect.left) / width - 0.5;
    const mouseYPos = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseXPos);
    y.set(mouseYPos);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: scale }}
      className={`relative group ${className}`}
    >
      {children}

      {/* Effet de brillance (Glare) */}
      <motion.div
        style={{
          background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.8) 0%, transparent 60%)`,
          opacity: glareOpacity,
          zIndex: 10,
        }}
        className="absolute inset-0 pointer-events-none rounded-[inherit] mix-blend-overlay"
      />
    </motion.div>
  );
}

