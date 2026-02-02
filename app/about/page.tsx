'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-purple-900/20 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 border-b border-white/10 backdrop-blur-xl bg-black/30">
        <Link href="/" className="text-xl font-black tracking-tighter uppercase text-white flex items-center gap-0">
          Music<span className="text-[#00e054]">Boxd</span>
        </Link>
        <Link
          href="/profile"
          className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest transition text-white/60 hover:text-white"
        >
          Retour
        </Link>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 md:p-12 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00e054] to-purple-600 flex items-center justify-center text-3xl shadow-lg">
              💡
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                À Propos de MusicBoxd
              </h1>
              <p className="text-white/40 text-sm mt-1">Votre réseau social musical</p>
            </div>
          </div>

          <div className="space-y-8 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                Notre Mission
              </h2>
              <p className="text-lg">
                MusicBoxd est une plateforme sociale dédiée aux passionnés de musique.
                Notre mission est de créer un espace où vous pouvez découvrir, partager et célébrer votre amour pour la musique.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                Ce que nous offrons
              </h2>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  <span className="text-3xl mb-3 block">🎵</span>
                  <h3 className="text-lg font-bold text-white mb-2">Découverte Musicale</h3>
                  <p className="text-sm text-white/60">
                    Explorez des millions d'albums via iTunes, Spotify et Deezer
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  <span className="text-3xl mb-3 block">⭐</span>
                  <h3 className="text-lg font-bold text-white mb-2">Avis & Notes</h3>
                  <p className="text-sm text-white/60">
                    Partagez vos impressions et notez vos albums préférés
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  <span className="text-3xl mb-3 block">📋</span>
                  <h3 className="text-lg font-bold text-white mb-2">Listes Personnalisées</h3>
                  <p className="text-sm text-white/60">
                    Créez et partagez vos playlists thématiques
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  <span className="text-3xl mb-3 block">👥</span>
                  <h3 className="text-lg font-bold text-white mb-2">Communauté</h3>
                  <p className="text-sm text-white/60">
                    Connectez-vous avec d'autres mélomanes
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                Technologies
              </h2>
              <p className="mb-4">
                MusicBoxd est construit avec les technologies modernes suivantes :
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Next.js', 'React', 'Supabase', 'TypeScript', 'Framer Motion', 'Tailwind CSS', 'iTunes API', 'Spotify API'].map((tech) => (
                  <div key={tech} className="bg-white/5 backdrop-blur-xl rounded-lg px-4 py-3 border border-white/10 text-center">
                    <span className="text-sm font-semibold text-white/80">{tech}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                Contact
              </h2>
              <div className="bg-gradient-to-br from-[#00e054]/10 to-purple-600/10 backdrop-blur-xl rounded-2xl p-6 border border-[#00e054]/20">
                <p className="text-white/80 mb-4">
                  Vous avez des questions, des suggestions ou besoin d'aide ?
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📧</span>
                    <div>
                      <p className="text-sm text-white/50">Email</p>
                      <p className="text-white font-semibold">contact@musicboxd.app</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/40 text-sm">
                © {new Date().getFullYear()} MusicBoxd. Tous droits réservés.
              </p>
              <div className="flex gap-4">
                <Link href="/cgu" className="text-sm text-white/60 hover:text-[#00e054] transition">
                  CGU
                </Link>
                <Link href="/confidentialite" className="text-sm text-white/60 hover:text-[#00e054] transition">
                  Confidentialité
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}