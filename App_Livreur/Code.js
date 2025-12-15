/**
 * Logique client (JavaScript) pour l'application Livreur.
 * Ce code est inclus via l'appel `<?!= include('Code'); ?>` dans Index.html.
 */

  // Variables globales (remplacez par l'email réel après authentification)
  // NOTE DU DEVELOPPEUR: Ces valeurs sont en dur (CHAUFFEUR_EMAIL, CHAUFFEUR_ID)
  // et doivent IMPERATIVEMENT être remplacées par un mécanisme de PropertiesService
  // et d'authentification SECURISEE (OAuth, Token) pour respecter la Règle 2.
  const CHAUFFEUR_EMAIL = 'maning2@hotmail.com'; // À remplacer par un mécanisme d'authentification réel
  const CHAUFFEUR_ID = 'LIV-101'; // À remplacer par l'ID réel après authentification

  /**
   * Initialise l'application en chargeant les tournées.
   */
  function initApp() {
    loadTournees();
  }

  /**
   * Appelle le serveur pour obtenir la liste des tournées.
   */
  function loadTournees() {
    google.script.run
      .withSuccessHandler(renderTournees)
      .withFailureHandler(handleError)
      .getListeTournees(CHAUFFEUR_EMAIL);
  }

  /**
   * Gère les erreurs du côté serveur.
   * @param {string} error L'objet d'erreur.
   */
  function handleError(error) {
    console.error("Erreur serveur :", error);
    const listDiv = document.getElementById('tournees-list');
    listDiv.innerHTML = `<p style="color: red; text-align: center;">Erreur de chargement: ${error.message || error.toString()}</p>`;
  }
  
  /**
   * Envoie les données de statut de livraison au serveur.
   * @param {string} tourneeId L'ID de la tournée (Event ID).
   * @param {string} livraisonId L'ID unique de l'arrêt.
   * @param {string} status Le nouveau statut (e.g., 'Livrée', 'Problème').
   * @param {string} note La note ou anomalie.
   * @param {string} arretDivId L'ID du div d'arrêt dans l'interface pour la mise à jour.
   */
  function updateLivraisonStatus(tourneeId, livraisonId, status, note, arretDivId) {
    const payload = {
      tournee_id: tourneeId,
      livraison_id: livraisonId,
      ehpad_id: livraisonId, // Simplification: on utilise l'ID de livraison comme ID d'établissement pour la traçabilité
      chauffeur_id: CHAUFFEUR_ID,
      status: status,
      anomalie_code: status === 'Livrée' ? 'RAS' : 'ANOMALIE',
      anomalie_note: note,
      // Ajout des coordonnées GPS réelles si l'API de géolocalisation était active
      gps_lat: '', 
      gps_lng: '',
      app_version: '1.0'
    };

    google.script.run
      .withSuccessHandler((response) => {
        if (response.success) {
          updateUI(arretDivId, status);
        } else {
          alert("Erreur lors de l'enregistrement: " + response.message);
        }
      })
      .withFailureHandler(handleError)
      .enregistrerStatutLivraison(payload);
  }

