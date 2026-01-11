/**
 * =================================================================
 * MODULE KNOWLEDGE BASE (RAG)
 * =================================================================
 * Gère l'indexation de documents (Drive) et la recherche vectorielle
 * pour alimenter l'IA avec des données métier.
 * =================================================================
 */

// Nom de la feuille de stockage des vecteurs
const KNOWLEDGE_SHEET_NAME = "CONFIG_KnowledgeBase";

// Configuration de l'indexation
const CHUNK_SIZE = 1000; // Caractères par morceau de texte
const SIMILARITY_THRESHOLD = 0.5; // Seuil minimum de pertinence

/**
 * Point d'entrée pour poser une question au bot "RAG".
 * @param {string} userQuestion - La question de l'utilisateur.
 * @return {string} La réponse générée par Gemini avec le contexte.
 */
function askElesBot(userQuestion) {
  Logger.log("askElesBot called with: " + userQuestion + " (Type: " + typeof userQuestion + ")");

  if (!userQuestion || typeof userQuestion !== 'string' || userQuestion.trim() === "") {
    return "Erreur: La question est vide ou invalide.";
  }

  // 1. Recherche des informations pertinentes
  const context = searchKnowledgeBase(userQuestion, 3); // Top 3 des résultats

  if (!context || context.length === 0) {
    // Pas d'info trouvée, on répond avec les connaissances générales ou un message par défaut
    // On laisse Gemini répondre mais en lui disant qu'on a pas de doc spécifique.
    return callGeminiFlash(
      "Tu es un assistant expert pour ELS (Logistique Santé). Réponds poliment.",
      userQuestion
    );
  }

  // 2. Construction du prompt avec contexte
  const contextText = context.map(c => `- ${c.content} (Source: ${c.source})`).join("\n\n");

  const systemPrompt = `
    Tu es l'assistant personnel d'ELS (EL Services). Ton ton est professionnel, direct et éloquent, mais sans formalisme excessif.
    
    Ta mission est d'aider l'utilisateur en synthétisant les informations fournies dans le CONTEXTE ci-dessous.
    
    Règles de style :
    - Sois clair et concis.
    - Évite les préambules inutiles ("En tant qu'IA...").
    - Rends la réponse fluide et naturelle.
    
    Règles de fond :
    - Base tes réponses UNIQUEMENT sur le contexte fourni.
    - Si l'information n'est pas dans le contexte, indique-le simplement ("Cette information n'est pas présente dans la documentation actuelle"), sans t'excuser outre mesure.
    
    --- CONTEXTE ---
    ${contextText}
    ----------------
  `;

  // 3. Appel à Gemini
  return callGeminiFlash(systemPrompt, userQuestion);
}

/**
 * Recherche les passages les plus pertinents dans la base de connaissance.
 * @param {string} query - La recherche.
 * @param {number} topK - Nombre de résultats max.
 */
function searchKnowledgeBase(query, topK) {
  const k = topK || 3;

  // 1. Vectoriser la question
  let queryVector;
  try {
    queryVector = getEmbedding(query);
  } catch (e) {
    Logger.log("Erreur embedding query: " + e.message);
    return [];
  }

  if (!queryVector || !queryVector.length) {
    Logger.log("Erreur: queryVector est vide ou invalide.");
    return [];
  }

  // 2. Récupérer tous les vecteurs de la base
  // Optimisation: On pourrait utiliser CacheService pour éviter de tout relire
  const ss = getMainSpreadsheet();
  const sheet = getKnowledgeSheet(ss);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return []; // Juste les headers

  const results = [];

  // Index des colonnes (basé sur ensureKnowledgeSheet)
  // Headers: ["DocId", "Source", "Type", "Content", "Embedding"]
  // On assume que l'embedding est en col 4 (0-indexed) -> colonne E

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const embeddingJson = row[4];

    if (!embeddingJson) continue;

    let vector;
    try {
      vector = JSON.parse(embeddingJson);
    } catch (e) { continue; }

    const similarity = cosineSimilarity(queryVector, vector);

    if (similarity > SIMILARITY_THRESHOLD) {
      results.push({
        score: similarity,
        source: row[1],
        content: row[3]
      });
    }
  }

  // 3. Trier et garder les meilleurs
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}

/**
 * Calcule la similarité cosinus entre deux vecteurs.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || !vecA.length || !vecB.length) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==========================================
// INDEXATION (ADMIN)
// ==========================================

/**
 * Itere sur un dossier Drive et indexe tous les fichiers supportés.
 * @param {string} folderId - ID du dossier Drive.
 * @param {boolean} [forceReindex=false] - (Non implémenté) Ecraser l'existant.
 */
function indexDriveFolder(folderId) {
  if (!folderId || typeof folderId !== 'string') {
    throw new Error("Arguments invalides : folderId est requis. Si vous lancez ceci depuis l'éditeur, utilisez une fonction de test qui passe un ID.");
  }

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();

  let totalIndexed = 0;

  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();

    Logger.log(`Traitement du fichier: ${file.getName()} (${mime})`);

    let textContent = "";

    try {
      if (mime === MimeType.GOOGLE_DOCS) {
        textContent = DocumentApp.openById(file.getId()).getBody().getText();
      } else if (mime === MimeType.PLAIN_TEXT) {
        textContent = file.getBlob().getDataAsString();
      } else if (mime === MimeType.PDF) {
        // Tentative d'extraction PDF (nécessite Drive API V2/V3 activé dans les Services Avancés)
        try {
          textContent = extractTextFromPdf(file.getId());
        } catch (pdfErr) {
          Logger.log(`Skipping PDF ${file.getName()} (Enable Drive API in Services for OCR): ${pdfErr.message}`);
          continue;
        }
      } else {
        continue; // Ignorer autres types
      }

      if (textContent && textContent.length > 50) {
        indexDocumentContent(file.getId(), file.getName(), mime, textContent);
        totalIndexed++;
      }

    } catch (e) {
      Logger.log(`Erreur lecture fichier ${file.getName()}: ${e.message}`);
    }
  }

  return `Indexation terminée. ${totalIndexed} documents traités.`;
}

/**
 * Extraction de texte depuis un PDF via Google Drive API (OCR).
 * Nécessite l'activation du service avancé "Drive" dans l'éditeur Apps Script.
 */
function extractTextFromPdf(fileId) {
  if (typeof Drive === 'undefined') {
    throw new Error("Service 'Drive' non activé. Allez dans 'Services' (+), ajoutez 'Drive API'.");
  }

  // 1. Crée une copie temporaire au format Google Doc (ce qui déclenche l'OCR)
  const resource = {
    title: "temp_ocr_" + fileId,
    mimeType: MimeType.GOOGLE_DOCS
  };

  const originalBlob = DriveApp.getFileById(fileId).getBlob();

  // Usage de l'API Drive (v2 syntaxe courante dans GAS Services)
  // Note: Si Drive v3 est activé, la syntaxe change (Drive.Files.create)
  // On tente la syntaxe v2 par défaut qui est le standard historique des Services GAS.
  let tempFile;
  try {
    tempFile = Drive.Files.insert(resource, originalBlob, { ocr: true });
  } catch (e) {
    // Fallback v3 si v2 échoue ou n'est pas dispo
    if (Drive.Files.create) {
      resource.name = resource.title; // v3 use name
      delete resource.title;
      tempFile = Drive.Files.create({ resource: resource, media: { body: originalBlob }, ocrLanguage: 'fr' });
    } else {
      throw e;
    }
  }

  // 2. Lit le contenu du Google Doc temporaire
  const doc = DocumentApp.openById(tempFile.id);
  const text = doc.getBody().getText();

  // 3. Nettoyage
  Drive.Files.remove(tempFile.id);

  return text;
}

/**
 * Découpe le texte, vectorise et sauvegarde.
 */
function indexDocumentContent(docId, title, type, fullText) {
  // 1. Chunking simple
  const chunks = [];
  for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
    chunks.push(fullText.substring(i, i + CHUNK_SIZE));
  }

  if (chunks.length === 0) return;

  // 2. Batch Embeddings
  const embeddings = batchGetEmbeddings(chunks);

  // 3. Sauvegarde
  const ss = getMainSpreadsheet();
  const sheet = getKnowledgeSheet(ss);

  // Prépare les lignes
  const rows = chunks.map((chunk, index) => {
    return [
      docId,           // DocId
      title,           // Source
      type,            // Type
      chunk,           // Content
      JSON.stringify(embeddings[index]) // Embedding (stocké en JSON string)
    ];
  });

  // Ajout en masse
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
  }
}

/**
 * Récupère ou crée la feuille de connaissances.
 */
function getKnowledgeSheet(ss) {
  // Structure: DocId | Source | Type | Content | Embedding
  return ensureSheetWithHeaders(ss, KNOWLEDGE_SHEET_NAME, [
    "DocId", "Source", "Type", "Content", "Embedding"
  ]);
}

/**
 * Fonction de TEST MANUEL pour l'indexation.
 * À lancer directement depuis l'éditeur Apps Script si l'interface web ne fonctionne pas.
 * Utilise l'ID fourni : 144qdIbP-njNmy-m6F425s6WxRjntN4yb
 */
function test_Indexation_Manuelle() {
  const TEST_ID = "144qdIbP-njNmy-m6F425s6WxRjntN4yb";
  Logger.log("Lancement test indexation avec ID : " + TEST_ID);

  try {
    const resultat = indexDriveFolder(TEST_ID);
    Logger.log("Succès : " + resultat);
  } catch (e) {
    Logger.log("Erreur durant le test : " + e.toString());
  }
}
