"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface StackCardProps {
  images: string[];
  title: string;
  subtitle: string;
  count?: number;
}

export default function StackCard({ images, title, subtitle, count }: StackCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // On prend max 4 images pour la pile de disques
  const stackImages = images.slice(0, 4);
  const hasImages = stackImages.length > 0;

  return (
    <div 
      className="group relative w-full cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container de la pile de disques */}
      <div className="relative w-full aspect-square mb-4">
        
        {/* Placeholder si pas d'images */}
        {!hasImages && (
           <div className="w-full h-full bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
             <span className="text-4xl opacity-20">🎵</span>
           </div>
        )}

        {/* Les disques empilés */}
        {hasImages && stackImages.map((img, index) => {
          // Calcul des positions d'éventail au survol
          const totalDiscs = stackImages.length;
          const angleSpread = 15; // Angle entre chaque disque
          const startAngle = -((totalDiscs - 1) * angleSpread) / 2;
          const hoverAngle = startAngle + index * angleSpread;
          const hoverX = index * 30 - ((totalDiscs - 1) * 20) / 2;
          
          return (
            <motion.div
              key={index}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: index }}
              initial={false}
              animate={{
                rotate: isHovered ? hoverAngle : index * 2,
                x: isHovered ? hoverX : index * 3,
                y: isHovered ? -10 : index * 3,
                scale: isHovered ? 1 : 1 - index * 0.03,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                delay: isHovered ? index * 0.05 : (totalDiscs - index) * 0.03
              }}
            >
              {/* Le disque vinyle */}
              <div className="relative w-[90%] h-[90%] rounded-full overflow-hidden shadow-2xl border-2 border-white/10 bg-[#0a0a0a]">
                {/* Image de l'album */}
                <img 
                  src={img} 
                  alt="Album Cover" 
                  className="w-full h-full object-cover"
                />
                
                {/* Effet vinyle : rainures */}
                <div 
                  className="absolute inset-0 rounded-full pointer-events-none opacity-40"
                  style={{ 
                    background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.5) 31%, transparent 32%, rgba(0,0,0,0.5) 33%, transparent 34%, rgba(0,0,0,0.5) 50%, transparent 51%, rgba(0,0,0,0.5) 65%, transparent 66%, rgba(0,0,0,0.5) 80%, transparent 81%)' 
                  }} 
                />
                
                {/* Trou central du vinyle */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[18%] h-[18%] bg-[#0a0a0a] rounded-full border border-white/20 flex items-center justify-center shadow-inner">
                  <div className="w-[35%] h-[35%] bg-black rounded-full"></div>
                </div>
                
                {/* Reflet brillant */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
              </div>
            </motion.div>
          );
        })}

        {/* Badge compteur */}
        {count && count > 4 && (
            <div className="absolute -top-1 -right-1 z-50 bg-[#00e054] text-black border-2 border-[#080808] font-black text-xs px-2 py-1 rounded-full shadow-lg">
                +{count - 4}
            </div>
        )}
      </div>

      {/* Infos Texte */}
      <div className="space-y-1 px-1 relative z-10">
        <h3 className="font-bold text-white text-sm md:text-base group-hover:text-[#00e054] transition-colors truncate">
          {title}
        </h3>
        <p className="text-xs text-gray-500 truncate font-medium uppercase tracking-wide">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

