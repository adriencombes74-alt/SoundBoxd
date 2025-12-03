'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        
        <Link href="/" className="text-sm text-gray-500 hover:text-white mb-8 block">← Retour à l'accueil</Link>
        
        <h1 className="text-5xl font-black mb-8 tracking-tight">
          Pourquoi <span className="text-[#00e054]">MusicBoxd</span> ?
        </h1>

        <div className="space-y-8 text-lg text-gray-300 leading-relaxed font-light">
          <p>
            Boredom, for real.
          </p>
          <p>
            Les algorithmes de streaming nous enferment dans des bulles. Nous voulions recréer l'expérience du disquaire : <strong>humaine, sociale et curieuse.</strong>
          </p>


          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Notre Mission</h2>
          <p>
            MusicBoxd n'est pas là pour remplacer Spotify ou Apple Music. Nous sommes la couche sociale qui manquait.
            Notre but est de vous aider à garder une trace de votre voyage musical et de découvrir ce qui fait vibrer vos amis.
          </p>
        </div>

        <div className="mt-20 pt-10 border-t border-white/10 text-center">
            <p className="text-gray-500 mb-6">Vous avez une idée pour améliorer l'app ?</p>
            <Link href="/feedback" className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-[#00e054] transition">
                Donnez votre avis
            </Link>
        </div>

      </div>
    </div>
  );
}