import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

export interface CleanContact {
  name: string;
  phones: string[];
}

/**
 * Nettoie un numéro de téléphone.
 * - Supprime les caractères non numériques (sauf +).
 * - Remplace le '0' initial par l'indicatif pays si fourni (par défaut +33 pour la France).
 * - Format cible : E.164 (ex: +33612345678)
 */
export const cleanPhoneNumber = (phone: string, defaultCountryCode: string = '+33'): string | null => {
  if (!phone) return null;

  // 1. Garder seulement les chiffres et le +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // 2. Gestion du format international
  if (cleaned.startsWith('+')) {
    // C'est déjà au format international (ex: +336...)
    return cleaned;
  } else if (cleaned.startsWith('00')) {
    // Remplacer 00 par +
    return '+' + cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    // Remplacer le 0 initial par l'indicatif
    return defaultCountryCode + cleaned.substring(1);
  } else {
    // Cas où il n'y a ni +, ni 0 (ex: 612345678), on ajoute l'indicatif
    // Attention : risque de faux positifs si le numéro est partiel
    return defaultCountryCode + cleaned;
  }
};

/**
 * Récupère les contacts du téléphone et nettoie les numéros.
 */
export const getLocalContacts = async (): Promise<CleanContact[]> => {
  try {
    // Vérifier si on est sur mobile (Capacitor)
    if (!Capacitor.isNativePlatform()) {
      console.warn('La synchronisation des contacts n\'est disponible que sur mobile.');
      return [];
    }

    // Demander la permission
    const perm = await Contacts.requestPermissions();
    if (perm.contacts !== 'granted') {
      throw new Error('Permission contacts refusée');
    }

    // Récupérer les contacts
    const { contacts } = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true
      }
    });

    // Traiter les données
    const processedContacts: CleanContact[] = contacts.map(contact => {
      const name = contact.name?.display || `${contact.name?.given || ''} ${contact.name?.family || ''}`.trim() || 'Inconnu';
      
      const phones = (contact.phones || [])
        .map(p => cleanPhoneNumber(p.number || ''))
        .filter((p): p is string => p !== null && p.length > 8); // Filtrer les numéros trop courts/nuls

      // Dédoublonner les numéros pour un même contact
      const uniquePhones = Array.from(new Set(phones));

      return {
        name,
        phones: uniquePhones
      };
    }).filter(c => c.phones.length > 0); // Garder uniquement ceux qui hanno des numéros valides

    return processedContacts;

  } catch (error) {
    console.error('Erreur lors de la récupération des contacts:', error);
    return [];
  }
};

/**
 * Synchronise les contacts locaux avec le backend.
 * Envoie la liste des numéros hashés ou bruts (selon politique de confidentialité) pour trouver des amis.
 */
export const syncContactsToBackend = async (userId: string) => {
  const contacts = await getLocalContacts();

  if (contacts.length === 0) {
    console.log('Aucun contact à synchroniser.');
    return;
  }

  // Extraire tous les numéros uniques
  const allPhoneNumbers = Array.from(new Set(contacts.flatMap(c => c.phones)));

  console.log(`Synchronisation de ${allPhoneNumbers.length} numéros...`);

  try {
    const response = await fetch('/api/contacts/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        contacts: allPhoneNumbers
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Résultat synchronisation:', result);
    return result;

  } catch (error) {
    console.error('Erreur lors de l\'envoi des contacts au backend:', error);
    throw error;
  }
};

