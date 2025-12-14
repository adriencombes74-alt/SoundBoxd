"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Settings, LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface ProfileMenuProps {
  user: any;
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // Force reload to clear state
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 md:gap-2 pl-2 md:pl-4 border-l border-white/10 hover:opacity-80 transition group"
      >
        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-[#00e054] to-emerald-600 flex items-center justify-center text-black font-black text-[10px] md:text-xs border-2 transition-all ${isOpen ? 'border-white scale-110' : 'border-transparent'}`}>
          {user.email ? user.email[0].toUpperCase() : '?'}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-4 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden z-50 backdrop-blur-xl"
          >
            <div className="p-3 border-b border-white/5">
                <p className="text-white font-bold text-sm truncate">{user.email}</p>
                <p className="text-gray-500 text-xs">Membre</p>
            </div>
            <div className="p-1">
                <Link 
                    href="/profile" 
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                >
                    <User size={16} />
                    Mon Profil
                </Link>
                <Link 
                    href="/settings" 
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                >
                    <Settings size={16} />
                    Paramètres
                </Link>
                <div className="h-px bg-white/5 my-1" />
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                >
                    <LogOut size={16} />
                    Déconnexion
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}