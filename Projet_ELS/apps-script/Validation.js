/**
 * Module de validation et sanitization centralisé.
 * Protège contre XSS, injection, et valide les formats de données.
 *
 * @module Validation
 */

/**
 * Schémas de validation prédéfinis pour les données courantes.
 */
const ValidationSchemas = {
  /**
   * Validation pour les livraisons
   */
  delivery: {
    deliveryId: {
      type: 'regex',
      pattern: /^[A-Z0-9-]{10,50}$/,
      errorMessage: 'ID livraison invalide (format: majuscules, chiffres, tirets, 10-50 caractères)'
    },
    amount: {
      type: 'function',
      validate: (v) => typeof v === 'number' && v > 0 && v < 100000,
      errorMessage: 'Montant invalide (doit être entre 0 et 100000)'
    },
    status: {
      type: 'enum',
      values: ['EN_ATTENTE', 'EN_COURS', 'LIVREE', 'ANNULEE'],
      errorMessage: 'Statut invalide'
    }
  },

  /**
   * Validation pour les contacts
   */
  contact: {
    email: {
      type: 'regex',
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      errorMessage: 'Email invalide'
    },
    phone: {
      type: 'regex',
      pattern: /^(\+33|0)[1-9](\d{2}){4}$/,
      errorMessage: 'Téléphone invalide (format français: +33123456789 ou 0123456789)'
    },
    name: {
      type: 'function',
      validate: (v) => typeof v === 'string' && v.length >= 2 && v.length <= 100,
      errorMessage: 'Nom invalide (2-100 caractères requis)'
    }
  },

  /**
   * Validation pour les dates
   */
  date: {
    dateString: {
      type: 'regex',
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      errorMessage: 'Date invalide (format requis: YYYY-MM-DD)'
    },
    timeString: {
      type: 'regex',
      pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
      errorMessage: 'Heure invalide (format requis: HH:MM)'
    }
  }
};

/**
 * Valide une valeur contre un validateur.
 *
 * @param {*} value - Valeur à valider
 * @param {Object} validator - Configuration du validateur
 * @returns {Object} {valid: boolean, error: string|null}
 * @private
 */
function validateValue_(value, validator) {
  // Valeur null/undefined
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: validator.errorMessage || 'Valeur requise'
    };
  }

  // Validation par regex
  if (validator.type === 'regex') {
    const stringValue = String(value).trim();
    if (!validator.pattern.test(stringValue)) {
      return {
        valid: false,
        error: validator.errorMessage || 'Format invalide'
      };
    }
    return { valid: true, error: null };
  }

  // Validation par fonction
  if (validator.type === 'function') {
    try {
      if (!validator.validate(value)) {
        return {
          valid: false,
          error: validator.errorMessage || 'Validation échouée'
        };
      }
      return { valid: true, error: null };
    } catch (e) {
      return {
        valid: false,
        error: `Erreur de validation: ${e.message}`
      };
    }
  }

  // Validation enum
  if (validator.type === 'enum') {
    if (!validator.values.includes(value)) {
      return {
        valid: false,
        error: validator.errorMessage || `Valeur doit être parmi: ${validator.values.join(', ')}`
      };
    }
    return { valid: true, error: null };
  }

  return {
    valid: false,
    error: 'Type de validateur inconnu'
  };
}

/**
 * Valide et sanitize un objet de données selon un schéma.
 *
 * @param {Object} data - Données à valider
 * @param {Object} schema - Schéma de validation (voir ValidationSchemas)
 * @param {Object} options - Options de validation
 * @param {boolean} options.allowExtraFields - Autoriser les champs non définis dans le schéma (défaut: false)
 * @param {boolean} options.sanitize - Sanitizer les valeurs string (défaut: true)
 * @returns {Object} {valid: boolean, errors: Array, sanitized: Object}
 *
 * @example
 * const result = validateAndSanitize(
 *   { email: 'test@example.com', phone: '0612345678' },
 *   ValidationSchemas.contact
 * );
 * if (!result.valid) {
 *   throw new Error(result.errors.join(', '));
 * }
 * const cleanData = result.sanitized;
 */
function validateAndSanitize(data, schema, options = {}) {
  const opts = {
    allowExtraFields: options.allowExtraFields || false,
    sanitize: options.sanitize !== false
  };

  const errors = [];
  const sanitized = {};

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Les données doivent être un objet'],
      sanitized: null
    };
  }

  // Valider chaque champ du schéma
  for (const [fieldName, validator] of Object.entries(schema)) {
    const value = data[fieldName];
    const validationResult = validateValue_(value, validator);

    if (!validationResult.valid) {
      errors.push(`${fieldName}: ${validationResult.error}`);
    } else {
      // Sanitize si c'est une string
      if (opts.sanitize && typeof value === 'string') {
        sanitized[fieldName] = sanitizeString(value);
      } else {
        sanitized[fieldName] = value;
      }
    }
  }

  // Vérifier les champs extra
  if (!opts.allowExtraFields) {
    for (const fieldName of Object.keys(data)) {
      if (!(fieldName in schema)) {
        errors.push(`${fieldName}: Champ non autorisé`);
      }
    }
  } else {
    // Copier les champs extra (sanitizés si string)
    for (const [fieldName, value] of Object.entries(data)) {
      if (!(fieldName in schema)) {
        if (opts.sanitize && typeof value === 'string') {
          sanitized[fieldName] = sanitizeString(value);
        } else {
          sanitized[fieldName] = value;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    sanitized: errors.length === 0 ? sanitized : null
  };
}

/**
 * Sanitize une chaîne pour prévenir XSS et injection.
 *
 * @param {string} str - Chaîne à sanitizer
 * @returns {string} Chaîne sanitizée
 *
 * @example
 * const safe = sanitizeString('<script>alert("XSS")</script>');
 * // Retourne: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valide un email.
 *
 * @param {string} email - Email à valider
 * @returns {boolean} true si valide
 */
function isValidEmail(email) {
  const result = validateValue_(email, ValidationSchemas.contact.email);
  return result.valid;
}

/**
 * Valide un téléphone français.
 *
 * @param {string} phone - Téléphone à valider
 * @returns {boolean} true si valide
 */
function isValidFrenchPhone(phone) {
  const result = validateValue_(phone, ValidationSchemas.contact.phone);
  return result.valid;
}

/**
 * Valide un montant.
 *
 * @param {number} amount - Montant à valider
 * @param {number} min - Montant minimum (défaut: 0)
 * @param {number} max - Montant maximum (défaut: 100000)
 * @returns {boolean} true si valide
 */
function isValidAmount(amount, min = 0, max = 100000) {
  return typeof amount === 'number' && amount > min && amount < max;
}

/**
 * Valide une date au format YYYY-MM-DD.
 *
 * @param {string} dateString - Date à valider
 * @returns {boolean} true si valide
 */
function isValidDate(dateString) {
  const result = validateValue_(dateString, ValidationSchemas.date.dateString);
  if (!result.valid) return false;

  // Vérifier que la date est réelle
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
}

/**
 * Échappe les caractères spéciaux SQL pour prévenir l'injection SQL.
 * Note: Toujours préférer les requêtes paramétrées si possible.
 *
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée
 */
function escapeSql(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/'/g, "''");
}

/**
 * Valide et nettoie un ID.
 * Accepte uniquement alphanumériques, tirets et underscores.
 *
 * @param {string} id - ID à valider
 * @param {number} minLength - Longueur minimale (défaut: 1)
 * @param {number} maxLength - Longueur maximale (défaut: 100)
 * @returns {string|null} ID nettoyé ou null si invalide
 */
function sanitizeId(id, minLength = 1, maxLength = 100) {
  if (typeof id !== 'string') {
    return null;
  }

  const cleaned = id.trim().replace(/[^a-zA-Z0-9_-]/g, '');

  if (cleaned.length < minLength || cleaned.length > maxLength) {
    return null;
  }

  return cleaned;
}

/**
 * Valide qu'une URL est sûre (https uniquement, domaines autorisés).
 *
 * @param {string} url - URL à valider
 * @param {Array<string>} allowedDomains - Domaines autorisés (optionnel)
 * @returns {boolean} true si URL sûre
 */
function isValidUrl(url, allowedDomains = null) {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Accepter uniquement HTTPS (ou HTTP pour localhost en dev)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    // Si des domaines sont spécifiés, vérifier
    if (allowedDomains && Array.isArray(allowedDomains)) {
      const hostname = parsed.hostname;
      const isAllowed = allowedDomains.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
      });
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validation stricte pour les paramètres de requête HTTP.
 * Utile pour les doGet/doPost Apps Script.
 *
 * @param {Object} params - Paramètres à valider (e.parameter de doGet/doPost)
 * @param {Object} schema - Schéma de validation
 * @returns {Object} {valid: boolean, errors: Array, sanitized: Object}
 *
 * @example
 * function doGet(e) {
 *   const result = validateHttpParams(e.parameter, {
 *     id: ValidationSchemas.delivery.deliveryId,
 *     action: { type: 'enum', values: ['view', 'edit'], errorMessage: 'Action invalide' }
 *   });
 *
 *   if (!result.valid) {
 *     return ContentService.createTextOutput(JSON.stringify({ error: result.errors }))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *
 *   // Utiliser result.sanitized...
 * }
 */
function validateHttpParams(params, schema) {
  return validateAndSanitize(params, schema, { allowExtraFields: false, sanitize: true });
}
