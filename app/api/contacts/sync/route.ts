import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { userId, contacts } = await request.json();

    if (!userId || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
    }

    // ICI : Logique de matching
    // 1. Rechercher dans la table 'profiles' les utilisateurs ayant ces numéros
    // Note : Cela suppose que la colonne 'phone' existe et est indexée
    
    const { data: matchedProfiles, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, phone_number')
      .in('phone_number', contacts) // Recherche exacte pour le moment. Pour une recherche plus floue, il faudrait normaliser côté DB aussi.
      .neq('id', userId); // Ne pas se trouver soi-même

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      matchedCount: matchedProfiles?.length || 0,
      matches: matchedProfiles
    });

  } catch (error) {
    console.error('Erreur API Sync Contacts:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

