/**
 * @file Secretary_Agent.js
 * @description "La Secrétaire Experte" - Agent IA spécialisé dans l'organisation, 
 * le classement du Drive, la rédaction de mails et le suivi administratif.
 * Ton : Professionnel, chaleureux et efficace (Experte & Charmante).
 */

const Agent_Base = require('./Agent_Base');
const DriveManager = require('./Drive_Manager');
const fs = require('fs');
const path = require('path');

class SecretaryAgent extends Agent_Base {
    constructor() {
        super('SECRETARY_AGENT');
        this.version = '1.0.1';
        this.context = "Tu es la secrétaire personnelle d'EL Services. Tu es experte, organisée et charmante. Ton but est de simplifier la vie de l'administrateur.";
    }

    /**
     * Analyse et classe automatiquement les fichiers en vrac à la racine du Drive.
     */
    async autopilotDriveClassification() {
        this.log("🧹 Autopilote de classification activé...");
        const rootId = process.env.GESTION_ELS_FOLDER_ID || '1HLBar6IvpJgrG_lfyRSKwNwib6U__w9U';
        const files = await DriveManager.listFiles(rootId);
        
        const bulkFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        
        if (bulkFiles.length === 0) {
            return "Tout est impeccable à la racine, aucun fichier ne traîne !";
        }

        let movedCount = 0;
        for (const file of bulkFiles) {
            const decisionPrompt = `
                Fichier : "${file.name}"
                Type : ${file.mimeType}
                
                Dossiers cibles possibles : Factures, Réservations, Emails, Documents.
                En tant que secrétaire experte, dans quel dossier ce fichier doit-il aller ?
                Réponds uniquement par le nom du dossier.
            `;
            
            const targetFolderName = await this.askGemini(decisionPrompt);
            const cleanTarget = targetFolderName?.trim().replace(/[.]/g, '');

            if (['Factures', 'Réservations', 'Emails', 'Documents'].includes(cleanTarget)) {
                // Pour simplifier, on cherche le dossier dans l'année/mois en cours via DriveManager
                // Mais ici on va chercher les dossiers racines pour la secrétaire
                const targetFolderId = await DriveManager.findFolder(cleanTarget, rootId);
                
                if (targetFolderId) {
                    const success = await DriveManager.moveFile(file.id, targetFolderId, rootId);
                    if (success) {
                        this.log(`✅ Déplacé: ${file.name} -> ${cleanTarget}`);
                        movedCount++;
                    }
                }
            }
        }

        return `J'ai fini mon petit rangement ! J'ai classé ${movedCount} fichier(s) pour vous.`;
    }

    /**
     * Simule ou prépare une relance par mail.
     */
    async prepareRelance(clientName, invoiceId) {
        const prompt = `
            ${this.context}
            Rédige un mail de relance pour le client ${clientName} concernant la facture ${invoiceId} qui est en attente.
            Le ton doit être chaleureux, expert et incisif.
        `;
        
        const draft = await this.askGemini(prompt);
        return draft;
    }

    /**
     * Cycle d'exécution automatique (appelé par Sentinel)
     */
    async runCycle() {
        this.log("✨ Session de secrétariat en cours...");
        
        // 1. Audit et rangement
        const classificationResult = await this.autopilotDriveClassification();
        this.log(classificationResult);

        return classificationResult;
    }
}

module.exports = new SecretaryAgent();
