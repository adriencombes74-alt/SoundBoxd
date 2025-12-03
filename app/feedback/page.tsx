'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function FeedbackPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('feedbacks').insert({
        user_id: user?.id,
        subject,
        message,
        rating
    });

    setLoading(false);
    if (error) {
        alert("Erreur lors de l'envoi.");
    } else {
        setSuccess(true);
        setSubject("");
        setMessage("");
    }
  };

  if (success) {
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
            <div className="text-center space-y-6 max-w-md">
                <div className="text-6xl">🎉</div>
                <h1 className="text-3xl font-bold text-white">Merci !</h1>
                <p className="text-gray-400">Votre retour est précieux.</p>
                <Link href="/">
                    <button className="mt-8 px-8 py-3 bg-[#00e054] text-black font-bold rounded-full hover:opacity-90 transition">
                        Retour à l'accueil
                    </button>
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <Link href="/" className="text-sm text-gray-500 hover:text-white mb-8 block">← Annuler</Link>
        
        <h1 className="text-4xl font-black text-white mb-2">Votre avis compte</h1>
        <p className="text-gray-400 mb-10">Signalez un bug ou proposez une idée.</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-[#121212] p-8 rounded-3xl border border-white/10 shadow-2xl">
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Sujet</label>
                <select 
                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-[#00e054] outline-none"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                >
                    <option value="" disabled>Choisir un sujet...</option>
                    <option value="suggestion">💡 Suggestion</option>
                    <option value="bug">🐛 Bug / Erreur</option>
                    <option value="other">Autre</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Notez l'app</label>
                <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`text-2xl transition hover:scale-110 ${star <= rating ? 'grayscale-0' : 'grayscale opacity-30'}`}
                        >
                            ⭐
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Message</label>
                <textarea 
                    required
                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-[#00e054] outline-none h-32 resize-none"
                    placeholder="Dites-nous tout..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-[#00e054] text-black font-bold rounded-xl hover:bg-[#00c04b] transition disabled:opacity-50 shadow-lg shadow-green-900/20"
            >
                {loading ? 'Envoi en cours...' : 'Envoyer le feedback'}
            </button>
        </form>
      </div>
    </div>
  );
}