'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ConfidentialitePage() {
    return (
        <div className="min-h-screen bg-[#080808] text-white relative overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 pointer-events-none" />

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
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
                            🔒
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                                Politique de Confidentialité
                            </h1>
                            <p className="text-white/40 text-sm mt-1">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>

                    <div className="space-y-8 text-white/80 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                                1. Données Collectées
                            </h2>
                            <p className="mb-4">
                                Nous collectons les informations suivantes lors de votre utilisation de MusicBoxd :
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Adresse email (pour l'authentification)</li>
                                <li>Nom d'utilisateur et photo de profil</li>
                                <li>Avis, notes et listes musicales que vous créez</li>
                                <li>Données d'interaction (likes, commentaires, abonnements)</li>
                                <li>Préférences musicales (artistes, albums favoris)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                                2. Utilisation des Données
                            </h2>
                            <p>
                                Vos données sont utilisées exclusivement pour :
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                <li>Personnaliser votre expérience sur la plateforme</li>
                                <li>Afficher vos avis et listes à la communauté</li>
                                <li>Générer des recommandations musicales</li>
                                <li>Améliorer nos services</li>
                            </ul>
                            <p className="mt-4">
                                <strong className="text-white">Nous ne vendons jamais vos données à des tiers.</strong>
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                                3. Sécurité
                            </h2>
                            <p>
                                Nous utilisons Supabase pour le stockage sécurisé de vos données.
                                Toutes les communications sont chiffrées via HTTPS. L'authentification est gérée par Supabase Auth avec des standards de sécurité élevés.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                                4. Services Tiers
                            </h2>
                            <p>
                                MusicBoxd utilise des APIs tierces pour récupérer les informations musicales :
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                <li>iTunes API (Apple)</li>
                                <li>Spotify API</li>
                                <li>Deezer API</li>
                            </ul>
                            <p className="mt-4">
                                Ces services peuvent collecter leurs propres données selon leurs politiques respectives.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                                5. Vos Droits
                            </h2>
                            <p>
                                Conformément au RGPD, vous disposez des droits suivants :
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                <li>Droit d'accès à vos données personnelles</li>
                                <li>Droit de rectification de vos données</li>
                                <li>Droit à l'effacement (suppression de compte)</li>
                                <li>Droit à la portabilité de vos données</li>
                                <li>Droit d'opposition au traitement</li>
                            </ul>
                            <p className="mt-4">
                                Pour exercer ces droits, vous pouvez modifier vos paramètres de profil ou nous contacter.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                                6. Cookies
                            </h2>
                            <p>
                                Nous utilisons uniquement des cookies essentiels pour :
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                <li>Maintenir votre session connectée</li>
                                <li>Sauvegarder vos préférences</li>
                            </ul>
                            <p className="mt-4">
                                Aucun cookie de tracking publicitaire n'est utilisé.
                            </p>
                        </section>

                        <div className="mt-12 pt-8 border-t border-white/10">
                            <p className="text-white/40 text-sm">
                                Pour toute question concernant votre vie privée, veuillez nous contacter via la page <Link href="/about" className="text-blue-400 hover:underline">À propos</Link>.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
