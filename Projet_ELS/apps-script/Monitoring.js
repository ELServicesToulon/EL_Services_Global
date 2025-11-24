/**
 * Module de monitoring et logging structuré.
 * Fournit des fonctionnalités de logging avec niveaux, métadonnées, et alertes.
 *
 * @module Monitoring
 */

/**
 * Niveaux de log disponibles.
 */
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Configuration du logger.
 */
const LoggerConfig = {
  // Version du schéma de log (pour tracking évolutions)
  SCHEMA_VERSION: '1.0.0',

  // Niveau minimum à logger (DEBUG, INFO, WARN, ERROR, CRITICAL)
  MIN_LEVEL: 'INFO',

  // Envoyer des alertes pour ERROR et CRITICAL
  ENABLE_ALERTS: true,

  // Email pour les alertes critiques (lu depuis Script Properties)
  ALERT_EMAIL_PROPERTY: 'ADMIN_EMAIL',

  // Activer le logging vers Stackdriver (Google Cloud Logging)
  ENABLE_STACKDRIVER: false
};

/**
 * Logger structuré avec support des métadonnées et alertes.
 */
const StructuredLogger = {
  /**
   * Crée une entrée de log structurée.
   *
   * @param {string} level - Niveau de log (DEBUG, INFO, WARN, ERROR, CRITICAL)
   * @param {string} message - Message de log
   * @param {Object} metadata - Métadonnées additionnelles
   * @returns {Object} Entrée de log formatée
   * @private
   */
  createLogEntry_: function(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      metadata: metadata,
      schema_version: LoggerConfig.SCHEMA_VERSION,
      session_id: this.getSessionId_(),
      user: this.getCurrentUser_()
    };
  },

  /**
   * Obtient l'utilisateur courant de manière sécurisée.
   *
   * @returns {string} Email de l'utilisateur ou 'anonymous'
   * @private
   */
  getCurrentUser_: function() {
    try {
      const email = Session.getActiveUser().getEmail();
      return email || 'anonymous';
    } catch (e) {
      return 'anonymous';
    }
  },

  /**
   * Génère ou récupère un ID de session.
   *
   * @returns {string} Session ID
   * @private
   */
  getSessionId_: function() {
    const cache = CacheService.getScriptCache();
    let sessionId = cache.get('monitoring_session_id');

    if (!sessionId) {
      sessionId = Utilities.getUuid();
      // Session expire après 6 heures
      cache.put('monitoring_session_id', sessionId, 21600);
    }

    return sessionId;
  },

  /**
   * Détermine si un niveau de log doit être enregistré.
   *
   * @param {string} level - Niveau à vérifier
   * @returns {boolean} true si doit être loggé
   * @private
   */
  shouldLog_: function(level) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const minIndex = levels.indexOf(LoggerConfig.MIN_LEVEL);
    const currentIndex = levels.indexOf(level);

    return currentIndex >= minIndex;
  },

  /**
   * Écrit un log dans la console Apps Script.
   *
   * @param {Object} logEntry - Entrée de log structurée
   * @private
   */
  writeToConsole_: function(logEntry) {
    const logString = JSON.stringify(logEntry);

    switch (logEntry.level) {
      case 'DEBUG':
      case 'INFO':
        console.info(logString);
        break;
      case 'WARN':
        console.warn(logString);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(logString);
        break;
    }
  },

  /**
   * Écrit un log dans Stackdriver (Google Cloud Logging).
   *
   * @param {Object} logEntry - Entrée de log structurée
   * @private
   */
  writeToStackdriver_: function(logEntry) {
    if (!LoggerConfig.ENABLE_STACKDRIVER) {
      return;
    }

    try {
      // Utilise l'API Cloud Logging
      // Note: Nécessite activation de Cloud Logging API et configuration OAuth
      console.info(logEntry); // Apps Script redirige automatiquement vers Stackdriver
    } catch (e) {
      console.error('Erreur Stackdriver logging: ' + e.message);
    }
  },

  /**
   * Envoie une alerte par email pour les erreurs critiques.
   *
   * @param {Object} logEntry - Entrée de log
   * @private
   */
  sendAlert_: function(logEntry) {
    if (!LoggerConfig.ENABLE_ALERTS) {
      return;
    }

    // Alertes uniquement pour ERROR et CRITICAL
    if (logEntry.level !== 'ERROR' && logEntry.level !== 'CRITICAL') {
      return;
    }

    try {
      const props = PropertiesService.getScriptProperties();
      const alertEmail = props.getProperty(LoggerConfig.ALERT_EMAIL_PROPERTY);

      if (!alertEmail) {
        console.warn('ADMIN_EMAIL non configuré, alerte non envoyée');
        return;
      }

      const subject = `[ELS ${logEntry.level}] ${logEntry.message}`;
      const body = this.formatAlertEmail_(logEntry);

      // Limiter les emails (max 1 alerte identique par heure)
      const alertKey = `alert_${logEntry.level}_${logEntry.message}`;
      const cache = CacheService.getScriptCache();

      if (cache.get(alertKey)) {
        console.info('Alerte throttled (déjà envoyée récemment): ' + alertKey);
        return;
      }

      MailApp.sendEmail({
        to: alertEmail,
        subject: subject,
        body: body,
        name: 'ELS Monitoring'
      });

      // Marquer comme envoyée pour 1 heure
      cache.put(alertKey, 'sent', 3600);

      console.info('Alerte email envoyée à: ' + alertEmail);
    } catch (e) {
      console.error('Erreur envoi alerte: ' + e.message);
    }
  },

  /**
   * Formate un email d'alerte.
   *
   * @param {Object} logEntry - Entrée de log
   * @returns {string} Corps de l'email
   * @private
   */
  formatAlertEmail_: function(logEntry) {
    const lines = [
      'Une erreur a été détectée dans l\'application ELS.',
      '',
      'NIVEAU: ' + logEntry.level,
      'MESSAGE: ' + logEntry.message,
      'TIMESTAMP: ' + logEntry.timestamp,
      'UTILISATEUR: ' + logEntry.user,
      'SESSION ID: ' + logEntry.session_id,
      '',
      'MÉTADONNÉES:',
      JSON.stringify(logEntry.metadata, null, 2),
      '',
      '---',
      'Cet email a été généré automatiquement par le système de monitoring ELS.',
      'Pour désactiver ces alertes, modifier LoggerConfig.ENABLE_ALERTS dans apps-script/Monitoring.js'
    ];

    return lines.join('\n');
  },

  /**
   * Méthode principale de logging.
   *
   * @param {string} level - Niveau de log
   * @param {string} message - Message
   * @param {Object} metadata - Métadonnées
   */
  log: function(level, message, metadata = {}) {
    if (!this.shouldLog_(level)) {
      return;
    }

    const logEntry = this.createLogEntry_(level, message, metadata);

    // Écrire dans la console
    this.writeToConsole_(logEntry);

    // Écrire dans Stackdriver si activé
    this.writeToStackdriver_(logEntry);

    // Envoyer alerte si nécessaire
    this.sendAlert_(logEntry);
  },

  /**
   * Log niveau DEBUG.
   *
   * @param {string} message - Message
   * @param {Object} metadata - Métadonnées
   */
  debug: function(message, metadata = {}) {
    this.log(LogLevel.DEBUG, message, metadata);
  },

  /**
   * Log niveau INFO.
   *
   * @param {string} message - Message
   * @param {Object} metadata - Métadonnées
   */
  info: function(message, metadata = {}) {
    this.log(LogLevel.INFO, message, metadata);
  },

  /**
   * Log niveau WARN.
   *
   * @param {string} message - Message
   * @param {Object} metadata - Métadonnées
   */
  warn: function(message, metadata = {}) {
    this.log(LogLevel.WARN, message, metadata);
  },

  /**
   * Log niveau ERROR.
   *
   * @param {string} message - Message
   * @param {Object} metadata - Métadonnées
   */
  error: function(message, metadata = {}) {
    this.log(LogLevel.ERROR, message, metadata);
  },

  /**
   * Log niveau CRITICAL (envoie toujours une alerte).
   *
   * @param {string} message - Message
   * @param {Object} metadata - Métadonnées
   */
  critical: function(message, metadata = {}) {
    this.log(LogLevel.CRITICAL, message, metadata);
  },

  /**
   * Log une exception avec stack trace.
   *
   * @param {Error} error - Exception à logger
   * @param {string} context - Contexte de l'erreur
   * @param {Object} metadata - Métadonnées additionnelles
   */
  logException: function(error, context = 'Unknown', metadata = {}) {
    const errorMetadata = {
      ...metadata,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      context: context
    };

    this.error(`Exception: ${error.message}`, errorMetadata);
  },

  /**
   * Mesure le temps d'exécution d'une fonction.
   *
   * @param {string} operationName - Nom de l'opération
   * @param {Function} fn - Fonction à mesurer
   * @returns {*} Résultat de la fonction
   *
   * @example
   * const result = StructuredLogger.measureTime('fetchData', () => {
   *   return UrlFetchApp.fetch('https://api.example.com');
   * });
   */
  measureTime: function(operationName, fn) {
    const startTime = new Date().getTime();

    try {
      const result = fn();
      const duration = new Date().getTime() - startTime;

      this.info(`Operation completed: ${operationName}`, {
        operation: operationName,
        duration_ms: duration,
        status: 'success'
      });

      return result;
    } catch (error) {
      const duration = new Date().getTime() - startTime;

      this.error(`Operation failed: ${operationName}`, {
        operation: operationName,
        duration_ms: duration,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }
};

/**
 * Collecteur de métriques pour monitoring performance.
 */
const MetricsCollector = {
  /**
   * Enregistre une métrique.
   *
   * @param {string} metricName - Nom de la métrique
   * @param {number} value - Valeur
   * @param {Object} tags - Tags additionnels
   */
  recordMetric: function(metricName, value, tags = {}) {
    StructuredLogger.info('Metric recorded', {
      metric_name: metricName,
      metric_value: value,
      tags: tags
    });
  },

  /**
   * Incrémente un compteur.
   *
   * @param {string} counterName - Nom du compteur
   * @param {number} increment - Valeur d'incrément (défaut: 1)
   * @param {Object} tags - Tags
   */
  incrementCounter: function(counterName, increment = 1, tags = {}) {
    this.recordMetric(counterName, increment, { ...tags, type: 'counter' });
  },

  /**
   * Enregistre une erreur dans les métriques.
   *
   * @param {string} errorType - Type d'erreur
   * @param {Object} tags - Tags
   */
  recordError: function(errorType, tags = {}) {
    this.incrementCounter('errors', 1, { ...tags, error_type: errorType });
  }
};

/**
 * Wrapper pour try/catch avec logging automatique.
 *
 * @param {Function} fn - Fonction à exécuter
 * @param {string} context - Contexte d'exécution
 * @param {*} defaultValue - Valeur par défaut en cas d'erreur
 * @returns {*} Résultat de la fonction ou defaultValue
 *
 * @example
 * const data = safeExecute(() => {
 *   return JSON.parse(jsonString);
 * }, 'parseJSON', {});
 */
function safeExecute(fn, context, defaultValue = null) {
  try {
    return fn();
  } catch (error) {
    StructuredLogger.logException(error, context);
    return defaultValue;
  }
}
