'use client';

export default function Vinyl({ imageUrl, size = "w-24 h-24" }: { imageUrl: string, size?: string }) {
  return (
    <div className={`relative ${size} group shrink-0`}>
        {/* Le Disque (Animation de rotation seulement au survol) */}
        <div className="absolute inset-0 rounded-full overflow-hidden group-hover:animate-[spin_2s_linear_infinite]">
            {/* L'image de l'album */}
            <img 
                src={imageUrl} 
                className="w-full h-full object-cover" 
                alt="Vinyl Cover"
            />
            
            {/* Texture Vinyle (Rainures) */}
            <div 
                className="absolute inset-0 rounded-full opacity-50 pointer-events-none" 
                style={{ background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.6) 31%, transparent 32%, rgba(0,0,0,0.6) 33%, transparent 34%, rgba(0,0,0,0.6) 35%, transparent 60%)' }} 
            />
            
            {/* Le Trou central */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] bg-[#1a1a1a] rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-[30%] h-[30%] bg-black rounded-full"></div>
            </div>
        </div>
    </div>
  );
}