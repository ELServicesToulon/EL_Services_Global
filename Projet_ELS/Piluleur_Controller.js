/**
 * Contrôleur pour l'assistant Piluleur.
 * Gère l'affichage de l'interface et la logique conversationnelle.
 */

/**
 * Fonction principale pour afficher l'interface de test de Piluleur.
 * Accessible via ?page=piluleur
 */
function renderPiluleurInterface() {
  const template = HtmlService.createTemplateFromFile('Piluleur_Index');
  return template.evaluate()
    .setTitle('Assistant Piluleur')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Récupère le contexte du client connecté (si existant).
 * @param {string} email
 * @returns {Object|null} Informations client ou null.
 */
function obtenirContexteClient(email) {
  if (!email) return null;
  // Utilise la fonction existante dans FeuilleCalcul.js
  // Assurez-vous que FeuilleCalcul.js est chargé dans le projet.
  try {
     return obtenirInfosClientParEmail(email);
  } catch (e) {
     Logger.log("Erreur obtenirContexteClient: " + e.message);
     return null;
  }
}

/**
 * Traite un message utilisateur et retourne une réponse structurée.
 * @param {string} message Le message de l'utilisateur.
 * @param {Object} sessionData Les données de session (état, contexte).
 * @returns {Object} La réponse { texte, nextStep, options, sessionData }.
 */
function traiterMessagePiluleur(message, sessionData) {
  var session = sessionData || {};
  var step = session.step || 'ACCUEIL';

  // Détection du contexte client au premier appel si non présent
  if (!session.clientInfo) {
     var userEmail = Session.getActiveUser().getEmail();
     var clientInfo = obtenirContexteClient(userEmail);
     if (clientInfo) {
       session.clientInfo = {
         nom: clientInfo.nom,
         email: clientInfo.email,
         clientId: clientInfo.clientId
       };
     }
  }

  // Init response structure
  var reponse = {
    texte: '',
    nextStep: step,
    options: [],
    sessionData: session
  };

  var msg = (message || '').trim();
  var msgLower = msg.toLowerCase();

  switch (step) {
    case 'ACCUEIL':
      var greeting = "Bonjour";
      if (session.clientInfo && session.clientInfo.nom) {
        greeting += " " + session.clientInfo.nom;
      }

      if (msgLower.indexOf('bonjour') !== -1 || msgLower.indexOf('hello') !== -1 || msgLower.indexOf('salut') !== -1 || step === 'ACCUEIL') {
        reponse.texte = greeting + ", je suis Piluleur. Voulez-vous réserver une nouvelle tournée ?";
        reponse.nextStep = 'INTENTION';
        reponse.options = ['Oui, réserver', 'Non, merci'];
      } else {
        reponse.texte = greeting + " ! Dites 'Bonjour' pour commencer.";
        reponse.nextStep = 'ACCUEIL';
        reponse.options = ['Bonjour'];
      }
      break;

    case 'INTENTION':
      if (msgLower.indexOf('oui') !== -1 || msgLower.indexOf('réserver') !== -1) {
        reponse.texte = "Entendu. Pour quelle date souhaitez-vous la livraison ? (Format: JJ/MM/AAAA, ou 'demain')";
        reponse.nextStep = 'CHOIX_DATE';
      } else if (msgLower.indexOf('non') !== -1) {
        reponse.texte = "D'accord. Je reste disponible si besoin. Dites 'Bonjour' pour recommencer.";
        reponse.nextStep = 'ACCUEIL';
      } else {
        reponse.texte = "Je n'ai pas compris. Voulez-vous réserver une tournée ?";
        reponse.options = ['Oui', 'Non'];
      }
      break;

    case 'CHOIX_DATE':
      // 1. Analyser la date
      var dateString = parseDateFromMessage(msg);

      if (!dateString) {
         reponse.texte = "Je n'ai pas compris la date. Merci d'utiliser le format JJ/MM/AAAA ou de dire 'demain'.";
         reponse.nextStep = 'CHOIX_DATE';
         break;
      }

      // 2. Vérifier les créneaux
      try {
        // On passe null pour email/exp/sig car c'est une utilisation interne via Session active user
        // Calendrier.js utilise Session.getActiveUser() donc ça devrait passer si l'utilisateur est autorisé ou admin.
        // Si c'est un client externe non connecté Google, ça peut bloquer.
        // Pour Piluleur V1, on assume l'utilisateur connecté ou public (si config le permet).
        var creneaux = obtenirCreneauxDisponiblesPourDate(dateString, DUREE_BASE);

        if (creneaux && creneaux.length > 0) {
           reponse.texte = "Voici les créneaux disponibles pour le " + dateString + " :";
           // Limiter le nombre d'options affichées pour le chat
           reponse.options = creneaux.slice(0, 5);
           reponse.sessionData.dateChoisie = dateString;
           reponse.nextStep = 'CONFIRMATION';
        } else {
           reponse.texte = "Désolé, aucun créneau disponible pour le " + dateString + ". Essayez une autre date.";
           reponse.nextStep = 'CHOIX_DATE';
        }
      } catch (e) {
         reponse.texte = "Une erreur est survenue lors de la vérification du calendrier : " + e.message;
         reponse.nextStep = 'ACCUEIL';
      }
      break;

    case 'CONFIRMATION':
      // On suppose que l'utilisateur clique sur un créneau
      // msg contient l'heure (ex: "10h00")
      var heure = msg; // Simplification

      // Simulation du calcul de prix (Pricing.js)
      try {
        var prixEstime = computeCoursePrice({ totalStops: 1 }); // Base 1 stop
        var prixAffiche = (prixEstime && prixEstime.formattedTotal) ? prixEstime.formattedTotal : "Prix inconnu";

        reponse.texte = "Vous avez choisi " + heure + " le " + session.dateChoisie + ". Prix estimé : " + prixAffiche + ". Confirmer ?";
        reponse.options = ['Confirmer', 'Annuler'];
        reponse.sessionData.heureChoisie = heure;
        reponse.nextStep = 'FIN'; // Ou validation réelle
      } catch (e) {
         reponse.texte = "Erreur lors du calcul du prix.";
         reponse.nextStep = 'ACCUEIL';
      }
      break;

    case 'FIN':
       if (msgLower.indexOf('confirmer') !== -1) {
         reponse.texte = "Réservation confirmée ! (Simulation). Merci.";
         reponse.nextStep = 'ACCUEIL';
       } else {
         reponse.texte = "Réservation annulée.";
         reponse.nextStep = 'ACCUEIL';
       }
       break;

    default:
      reponse.texte = "Désolé, je suis perdu. On recommence ?";
      reponse.nextStep = 'ACCUEIL';
      break;
  }

  reponse.sessionData.step = reponse.nextStep;

  return reponse;
}

/**
 * Utilitaire simple pour parser une date (demain ou JJ/MM/YYYY).
 * @param {string} msg
 * @returns {string|null} Date YYYY-MM-DD ou null
 */
function parseDateFromMessage(msg) {
  var m = msg.trim().toLowerCase();
  var now = new Date();

  if (m.indexOf('demain') !== -1) {
    now.setDate(now.getDate() + 1);
    return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  // Regex JJ/MM ou JJ/MM/AAAA
  var regex = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/;
  var match = m.match(regex);

  if (match) {
    var jour = parseInt(match[1], 10);
    var mois = parseInt(match[2], 10);
    var an = match[3] ? parseInt(match[3], 10) : now.getFullYear();

    if (an < 100) an += 2000; // Gestion années 2 chiffres

    // Création date pour validation et formatage
    var d = new Date(an, mois - 1, jour);
    if (d.getFullYear() === an && d.getMonth() === mois - 1 && d.getDate() === jour) {
       return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  }

  return null;
}
