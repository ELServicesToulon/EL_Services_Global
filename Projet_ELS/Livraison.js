// =================================================================
//                    LOGIQUE MÉTIER LIVRAISON
// =================================================================
// Description: Fonctions backend pour la gestion des livraisons
// =================================================================

/**
 * Récupère les tournées du jour pour le livreur
 * @returns {Object} Liste des tournées avec leurs arrêts
 */
function obtenirTourneeDuJour() {
  try {
    const config = getLivraisonConfig();

    // Si pas de spreadsheet configuré, retourner des données de test
    if (!config.spreadsheetId) {
      return {
        success: true,
        date: new Date().toISOString().split('T')[0],
        tournees: [
          {
            id: 'demo-1',
            heure: '09:00',
            adresse: 'Pharmacie du Port, 123 Quai de Toulon',
            client: 'Pharmacie du Port',
            totalStops: 3,
            statut: 'en_cours',
            notes: []
          },
          {
            id: 'demo-2',
            heure: '14:30',
            adresse: 'Pharmacie Centrale, 45 Av. République',
            client: 'Pharmacie Centrale',
            totalStops: 2,
            statut: 'a_venir',
            notes: []
          }
        ]
      };
    }

    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = ss.getSheetByName(config.sheetNameTournees);

    if (!sheet) {
      return { success: false, error: 'Feuille Tournées introuvable' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const aujourdhui = new Date().toISOString().split('T')[0];

    const tournees = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dateTournee = row[0] ? new Date(row[0]).toISOString().split('T')[0] : null;

      if (dateTournee === aujourdhui) {
        tournees.push({
          id: row[headers.indexOf('ID')] || `tournee-${i}`,
          heure: row[headers.indexOf('Heure')] || '',
          adresse: row[headers.indexOf('Adresse')] || '',
          client: row[headers.indexOf('Client')] || '',
          totalStops: row[headers.indexOf('Arrêts')] || 1,
          statut: row[headers.indexOf('Statut')] || 'a_venir',
          notes: []
        });
      }
    }

    return {
      success: true,
      date: aujourdhui,
      tournees: tournees
    };

  } catch (error) {
    Logger.log('Erreur obtenirTourneeDuJour: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Sauvegarde une note de livraison avec géolocalisation
 * @param {Object} noteData - Données de la note
 * @returns {Object} Résultat de l'opération
 */
function sauvegarderNote(noteData) {
  try {
    const config = getLivraisonConfig();

    // Validation des données
    if (!noteData || !noteData.tourneeId || !noteData.texte) {
      return { success: false, error: 'Données incomplètes' };
    }

    // Si pas de spreadsheet, simuler le succès
    if (!config.spreadsheetId) {
      Logger.log('Note sauvegardée (mode démo): ' + JSON.stringify(noteData));
      return {
        success: true,
        message: 'Note sauvegardée (mode démo)',
        noteId: 'demo-' + Date.now()
      };
    }

    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    let sheet = ss.getSheetByName(config.sheetNameNotes);

    // Créer la feuille si elle n'existe pas
    if (!sheet) {
      sheet = ss.insertSheet(config.sheetNameNotes);
      sheet.appendRow([
        'Timestamp',
        'Tournée ID',
        'Heure Note',
        'Texte',
        'Arrêt',
        'Latitude',
        'Longitude',
        'Précision (m)',
        'Adresse approx.',
        'Source'
      ]);
    }

    const timestamp = new Date();
    const heureNote = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');

    sheet.appendRow([
      timestamp,
      noteData.tourneeId,
      heureNote,
      noteData.texte,
      noteData.stopNumber || '',
      noteData.latitude || '',
      noteData.longitude || '',
      noteData.precision || '',
      noteData.adresseApprox || '',
      noteData.source || ''
    ]);

    return {
      success: true,
      message: 'Note sauvegardée',
      noteId: timestamp.getTime().toString()
    };

  } catch (error) {
    Logger.log('Erreur sauvegarderNote: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour le statut d'une tournée
 * @param {string} tourneeId - ID de la tournée
 * @param {string} nouveauStatut - Nouveau statut (en_cours, termine, probleme)
 * @returns {Object} Résultat
 */
function mettreAJourStatutTournee(tourneeId, nouveauStatut) {
  try {
    const config = getLivraisonConfig();

    if (!config.spreadsheetId) {
      return { success: true, message: 'Statut mis à jour (mode démo)' };
    }

    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = ss.getSheetByName(config.sheetNameTournees);

    if (!sheet) {
      return { success: false, error: 'Feuille Tournées introuvable' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID') + 1;
    const statutCol = headers.indexOf('Statut') + 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol - 1] === tourneeId) {
        sheet.getRange(i + 1, statutCol).setValue(nouveauStatut);
        return { success: true, message: 'Statut mis à jour' };
      }
    }

    return { success: false, error: 'Tournée non trouvée' };

  } catch (error) {
    Logger.log('Erreur mettreAJourStatutTournee: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère l'historique des notes pour une tournée
 * @param {string} tourneeId - ID de la tournée
 * @returns {Object} Notes de la tournée
 */
function obtenirNotesTournee(tourneeId) {
  try {
    const config = getLivraisonConfig();

    if (!config.spreadsheetId) {
      return { success: true, notes: [] };
    }

    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = ss.getSheetByName(config.sheetNameNotes);

    if (!sheet) {
      return { success: true, notes: [] };
    }

    const data = sheet.getDataRange().getValues();
    const notes = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === tourneeId) {
        notes.push({
          timestamp: data[i][0],
          heure: data[i][2],
          texte: data[i][3],
          stopNumber: data[i][4] || null,
          latitude: data[i][5],
          longitude: data[i][6],
          precision: data[i][7],
          adresse: data[i][8],
          source: data[i][9] || ''
        });
      }
    }

    return { success: true, notes: notes };

  } catch (error) {
    Logger.log('Erreur obtenirNotesTournee: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Synchronise les tournées du jour avec le calendrier de livraison (Google Calendar).
 * Crée ou met à jour un événement par tournée, basé sur l'ID de tournée.
 * @param {boolean=} forceWake Non utilisé ici, conservé pour parité d'API éventuelle.
 * @returns {{success:boolean, created:number, updated:number, errors?:Array<string>}}
 */
function synchroniserCalendrierLivraison(forceWake) {
  try {
    const config = getLivraisonConfig();
    if (!config.calendarLivraisonId) {
      return { success: false, error: 'CALENDRIER_LIVRAISON_ID manquant dans les ScriptProperties.' };
    }

    const res = obtenirTourneeDuJour();
    if (!res || res.success !== true) {
      return { success: false, error: res && res.error ? res.error : 'Impossible de charger les tournées du jour.' };
    }

    const tournees = res.tournees || [];
    if (tournees.length === 0) {
      return { success: true, created: 0, updated: 0, message: 'Aucune tournée à synchroniser.' };
    }

    const dateJour = res.date || new Date().toISOString().split('T')[0];
    let created = 0;
    let updated = 0;
    const errors = [];

    tournees.forEach(tournee => {
      try {
        const eventId = construireEventIdCalendrier_(tournee.id || '');
        const start = construireDateHeure_(dateJour, tournee.heure || '08:00');
        if (!start) {
          errors.push('Heure invalide pour ' + tournee.id);
          return;
        }
        const end = new Date(start.getTime() + 45 * 60000); // durée par défaut 45 min

        const timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'Europe/Paris';
        const resource = {
          summary: 'Livraison - ' + (tournee.client || 'Client'),
          location: tournee.adresse || '',
          description: 'Tournée ELS\nStatut: ' + (tournee.statut || 'a_venir') + '\nArrêts: ' + (tournee.totalStops || 0),
          start: { dateTime: start.toISOString(), timeZone: timeZone },
          end: { dateTime: end.toISOString(), timeZone: timeZone },
          colorId: couleurPourStatut_(tournee.statut),
          reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] }
        };

        try {
          Calendar.Events.update(resource, config.calendarLivraisonId, eventId);
          updated++;
        } catch (updateErr) {
          if (String(updateErr).indexOf('Not Found') !== -1) {
            Calendar.Events.insert(resource, config.calendarLivraisonId, { eventId: eventId });
            created++;
          } else {
            throw updateErr;
          }
        }
      } catch (errTournee) {
        errors.push('Tournee ' + (tournee.id || '?') + ': ' + errTournee.toString());
      }
    });

    return {
      success: errors.length === 0,
      created: created,
      updated: updated,
      errors: errors
    };
  } catch (err) {
    Logger.log('Erreur synchroniserCalendrierLivraison: ' + err);
    return { success: false, error: err.message || 'Erreur inconnue' };
  }
}

function construireEventIdCalendrier_(tourneeId) {
  const base = String(tourneeId || 'tournee').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const sanitized = base && base.length >= 4 ? base : ('tournee-' + new Date().getTime());
  return 'liv-' + sanitized;
}

function construireDateHeure_(dateISO, heureStr) {
  if (!dateISO || !heureStr) return null;
  const safeHeure = String(heureStr).trim();
  const hh = safeHeure.split(':')[0] || '08';
  const mm = safeHeure.split(':')[1] || '00';
  const iso = dateISO + 'T' + hh.padStart(2, '0') + ':' + mm.padStart(2, '0') + ':00';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function couleurPourStatut_(statut) {
  // Palette Google Calendar : https://developers.google.com/calendar/api/v3/reference/colors
  switch (statut) {
    case 'en_cours':
      return '5'; // jaune
    case 'termine':
      return '10'; // vert
    case 'probleme':
      return '11'; // rouge
    default:
      return '9'; // bleu par défaut
  }
}
