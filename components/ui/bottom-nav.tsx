'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, User, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    // Vérifier l'utilisateur au montage
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };
    checkUser();

    // Écouter les changements d'auth (connexion/déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    {
      label: 'Accueil',
      path: '/',
      icon: Home,
    },
    {
      label: 'Découvrir',
      path: '/discover',
      icon: Compass,
    },
    {
      label: 'Communauté',
      path: '/community',
      icon: Users,
    },
    {
      label: 'Recherche',
      path: '/search',
      icon: Search,
    },
    {
      label: 'Profil',
      path: user ? '/profile' : '/login',
      icon: User,
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe md:hidden">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.label} 
              href={item.path}
              className="relative flex flex-1 flex-col items-center justify-center h-full group"
            >
              {/* Fond Animé Glissant (La "Pillule" magique) */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-x-3 inset-y-2 bg-white/10 rounded-2xl"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              {/* Contenu de l'icône avec animation */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <motion.div
                    animate={{ 
                        scale: active ? 1.1 : 1,
                        y: active ? -2 : 0 
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                    <Icon 
                        size={24} 
                        strokeWidth={active ? 2.5 : 2}
                        className={`transition-colors duration-200 ${
                            active ? 'text-[#00e054]' : 'text-gray-500 group-hover:text-gray-300'
                        }`}
                    />
                </motion.div>
                
                <motion.span 
                    animate={{ 
                        opacity: active ? 1 : 0.6,
                        scale: active ? 1 : 0.9,
                        color: active ? '#00e054' : '#6b7280'
                    }}
                    className="text-[10px] font-medium"
                >
                    {item.label}
                </motion.span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
