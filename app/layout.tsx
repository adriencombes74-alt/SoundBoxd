import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
// Import du nouveau composant
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MusicBoxd",
  description: "Votre vie en musique.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#050505] text-white min-h-screen flex flex-col`}>
        
        {/* ON ENGLOBE TOUT AVEC LE TOAST PROVIDER */}
        <ToastProvider>
            
            <div className="flex-1">
            {children}
            </div>

            {/* FOOTER GLOBAL */}
            <footer className="border-t border-white/10 bg-[#0a0a0a] mt-20">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                
                <div className="space-y-4">
                    <Link href="/" className="text-2xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Music<span className="text-[#00e054]">Boxd</span>
                    </Link>
                    <p className="text-gray-500 text-sm leading-relaxed">
                    La plateforme sociale pour les passionnés de musique. Notez, partagez, découvrez.
                    </p>
                    <div className="text-xs text-gray-600">© 2025 MusicBoxd Inc.</div>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Explorer</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                    <li><Link href="/search" className="hover:text-[#00e054] transition">Rechercher un album</Link></li>
                    <li><Link href="/community" className="hover:text-[#00e054] transition">Communauté</Link></li>
                    <li><Link href="/" className="hover:text-[#00e054] transition">Tendances</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">L'Équipe</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                    <li><Link href="/about" className="hover:text-[#00e054] transition">À propos de nous</Link></li>
                    <li><span className="opacity-50 cursor-not-allowed">Carrières (Bientôt)</span></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Support</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                    <li><Link href="/feedback" className="flex items-center gap-2 hover:text-[#00e054] transition"><span className="text-lg">✉️</span> Envoyer un avis</Link></li>
                    <li>
                        <a 
                            href="https://www.linkedin.com/in/adrien-combes74/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-[#00e054] transition flex items-center gap-2"
                        >
                            Contactez-nous (LinkedIn)
                        </a>
                    </li>
                    <li><span className="opacity-50 cursor-not-allowed">Conditions d'utilisation</span></li>
                    </ul>
                </div>
                </div>
                <div className="pt-8 border-t border-white/5 text-center text-xs text-gray-600">
                Fait avec ❤️ pour la musique.
                </div>
            </div>
            </footer>

        </ToastProvider>

      </body>
    </html>
  );
}