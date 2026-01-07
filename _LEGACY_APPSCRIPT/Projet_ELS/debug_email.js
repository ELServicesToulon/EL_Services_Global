function debugEmailSystem() {
  console.log("=== DÉBUT DIAGNOSTIC EMAIL ===");

  // 1. Vérification de l'utilisateur et des quotas
  const user = Session.getActiveUser().getEmail();
  const effectiveUser = Session.getEffectiveUser().getEmail();
  console.log("Utilisateur actif: " + user);
  console.log("Utilisateur effectif (script): " + effectiveUser);

  try {
    const quota = MailApp.getRemainingDailyQuota();
    console.log("Quota email restant: " + quota);
  } catch (e) {
    console.error("Impossible de lire le quota: " + e.message);
  }

  // 2. Vérification de la configuration
  let adminEmail;
  try {
    adminEmail = getSecret('ADMIN_EMAIL');
    console.log("ADMIN_EMAIL récupéré: " + adminEmail);
  } catch (e) {
    console.error("ERREUR CRITIQUE: ADMIN_EMAIL manquant ou inaccessible: " + e.message);
    return;
  }

  // 3. Test d'envoi simple via MailApp (le plus bas niveau)
  console.log("Tentative d'envoi MailApp...");
  try {
    MailApp.sendEmail({
      to: adminEmail,
      subject: "TEST DIAGNOSTIC - " + new Date().toISOString(),
      body: "Ceci est un test de diagnostic pour vérifier si l'envoi d'email fonctionne techniquement.\n\nSi vous recevez ceci, le service MailApp est fonctionnel."
    });
    console.log(">>> SUCCÈS: MailApp.sendEmail n'a pas levé d'erreur.");
  } catch (e) {
    console.error(">>> ÉCHEC MailApp: " + e.toString());
  }

  // 4. Test d'envoi via GmailApp (niveau supérieur, nécessite scope gmail.send)
  console.log("Tentative d'envoi GmailApp...");
  try {
    GmailApp.sendEmail(adminEmail, "TEST DIAGNOSTIC GMAIL - " + new Date().toISOString(), "Test via GmailApp.");
    console.log(">>> SUCCÈS: GmailApp.sendEmail n'a pas levé d'erreur.");
  } catch (e) {
    console.error(">>> ÉCHEC GmailApp: " + e.toString());
  }

  console.log("=== FIN DIAGNOSTIC EMAIL ===");
  return "Diagnostic terminé. Vérifiez les logs.";
}
