import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
// Assurez-vous d'avoir créé le fichier ToastProvider dans components/
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

// --- CONFIGURATION MOBILE OPTIMISÉE ---
export const metadata: Metadata = {
  title: "MusicBoxd",
  description: "Votre vie en musique.",
  manifest: "/manifest.json",
  
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MusicBoxd",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import BottomNav from "@/components/ui/bottom-nav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#050505] text-white min-h-screen flex flex-col`}>
        
        {/* ENGLOBE TOUT LE SITE AVEC LE CONTEXTE DE NOTIFICATION */}
        <ToastProvider>
            
            {/* CONTENU DES PAGES */}
            <div className="flex-1">
              {children}
            </div>

            <BottomNav />

            {/* FOOTER GLOBAL */}
            <footer className="border-t border-white/10 bg-[#0a0a0a] mt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                
                {/* Marque */}
                <div className="space-y-4">
                    <Link href="/" className="text-2xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Music<span className="text-[#00e054]">Boxd</span>
                    </Link>
                    <p className="text-gray-500 text-sm leading-relaxed">
                    La plateforme sociale pour les passionnés de musique. Notez, partagez, découvrez.
                    </p>
                    <div className="text-xs text-gray-600">© 2025 MusicBoxd Inc.</div>
                </div>

                {/* Menu */}
                <div>
                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Menu</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                    <li><Link href="/search" className="hover:text-[#00e054] transition">Recherche</Link></li>
                    <li><Link href="/community" className="hover:text-[#00e054] transition">Communauté</Link></li>
                    <li><Link href="/profile" className="hover:text-[#00e054] transition">Profil</Link></li>
                    </ul>
                </div>

                {/* Légal */}
                <div>
                   <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Légal</h4>
                   <ul className="space-y-3 text-sm text-gray-400">
                     <li><Link href="/about" className="hover:text-[#00e054] transition">À propos</Link></li>
                     <li><span className="opacity-50 cursor-not-allowed">Confidentialité</span></li>
                     <li><span className="opacity-50 cursor-not-allowed">CGU</span></li>
                   </ul>
                </div>

                {/* Contact */}
                <div>
                   <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Contact</h4>
                   <ul className="space-y-3 text-sm text-gray-400">
                     <li><Link href="/feedback" className="hover:text-[#00e054] transition">Envoyer un avis</Link></li>
                     {/* LIEN LINKEDIN */}
                     <li>
                        <a 
                            href="https://www.linkedin.com/in/votre-profil" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-[#00e054] transition flex items-center gap-2"
                        >
                            Contactez-nous (LinkedIn)
                        </a>
                     </li>
                   </ul>
                </div>

                </div>
            </div>
            </footer>
        </ToastProvider>

      </body>
    </html>
  );
}