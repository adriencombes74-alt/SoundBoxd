'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Bascule entre Connexion et Inscription
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // --- INSCRIPTION ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: "Compte créé ! Vous pouvez vous connecter.", type: 'success' });
        setIsSignUp(false); // On bascule vers la connexion
      } else {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Si succès, on redirige vers l'accueil
        router.push('/'); 
        router.refresh(); // Rafraîchit pour mettre à jour l'interface
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Une erreur est survenue", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#14181c] flex items-center justify-center p-4">
      <div className="bg-[#2c3440] p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        
        {/* En-tête */}
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold text-white tracking-tighter uppercase mb-2 block">
            Music<span className="text-[#00e054]">Boxd</span>
          </a>
          <p className="text-gray-400 text-sm">
            {isSignUp ? "Rejoignez la communauté" : "Connectez-vous pour noter vos albums"}
          </p>
        </div>

        {/* Message d'erreur ou succès */}
        {message && (
          <div className={`p-3 rounded mb-4 text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
            {message.text}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-[#14181c] border border-gray-600 rounded p-3 text-white focus:border-[#00e054] focus:outline-none transition"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full bg-[#14181c] border border-gray-600 rounded p-3 text-white focus:border-[#00e054] focus:outline-none transition"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00e054] hover:bg-[#00c04b] text-black font-bold py-3 rounded transition uppercase tracking-wide text-sm mt-6 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (isSignUp ? "S'inscrire" : "Se connecter")}
          </button>
        </form>

        {/* Bascule Connexion / Inscription */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            {isSignUp ? "J'ai déjà un compte" : "Pas encore de compte ? Créer un compte"}
          </button>
        </div>

        <div className="mt-8 text-center">
           <a href="/" className="text-xs text-gray-500 hover:text-gray-300">← Retour à l'accueil</a>
        </div>
      </div>
    </div>
  );
}