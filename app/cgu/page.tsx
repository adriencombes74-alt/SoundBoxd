'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CGUPage() {
    return (
        <div className="min-h-screen bg-[#080808] text-white relative overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-green-900/20 pointer-events-none" />

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
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00e054] to-blue-600 flex items-center justify-center text-3xl shadow-lg">
                            📜
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                                Conditions Générales d'Utilisation
                            </h1>
                            <p className="text-white/40 text-sm mt-1">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>

                    <div className="space-y-8 text-white/80 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                                1. Introduction
                            </h2>
                            <p>
                                Bienvenue sur MusicBoxd. En utilisant notre service, vous acceptez les présentes conditions générales d'utilisation.
                                Veuillez les lire attentivement avant d'utiliser notre plateforme.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                                2. Utilisation du Service
                            </h2>
                            <p>
                                MusicBoxd est une plateforme dédiée à la découverte musicale, au partage d'avis sur des albums et à la création de listes personnalisées.
                                Vous vous engagez à utiliser le service de manière responsable et respectueuse.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                                3. Contenu Généré par les Utilisateurs
                            </h2>
                            <p>
                                Vous conservez les droits sur le contenu que vous publiez (avis, listes, commentaires).
                                Cependant, en publiant du contenu sur MusicBoxd, vous nous accordez une licence non-exclusive pour afficher, distribuer et promouvoir ce contenu.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                                4. Propriété Intellectuelle
                            </h2>
                            <p>
                                Tout le contenu de la plateforme (design, logo, code) reste la propriété exclusive de MusicBoxd,
                                sauf mention contraire. Les données musicales proviennent de services tiers (iTunes, Spotify, Deezer).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-[#00e054] rounded-full"></span>
                                5. Limitation de Responsabilité
                            </h2>
                            <p>
                                MusicBoxd est fourni "tel quel". Nous ne garantissons pas la disponibilité continue du service et déclinons toute responsabilité
                                en cas de perte de données ou d'interruption de service.
                            </p>
                        </section>

                        <div className="mt-12 pt-8 border-t border-white/10">
                            <p className="text-white/40 text-sm">
                                Pour toute question concernant ces CGU, veuillez nous contacter via la page <Link href="/about" className="text-[#00e054] hover:underline">À propos</Link>.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
