// =================================================================
//                      VALIDATEURS
// =================================================================
/**
 * @fileoverview Fonctions de validation des données entrantes.
 */

var Validators = (function() {
  'use strict';

  function isEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  function isDate(dateStr) {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }

  function isNonEmptyString(str) {
    return typeof str === 'string' && str.trim().length > 0;
  }

  function isPositiveNumber(num) {
    return typeof num === 'number' && isFinite(num) && num > 0;
  }

  /**
   * Valide un objet de réservation.
   * @param {Object} resa
   * @returns {Object} { valid: boolean, errors: Array }
   */
  function validateReservation(resa) {
    const errors = [];
    if (!resa) return { valid: false, errors: ['Données manquantes'] };

    if (!isEmail(resa.clientEmail)) errors.push('Email client invalide');
    if (!isNonEmptyString(resa.clientNom)) errors.push('Nom client manquant');
    if (!isDate(resa.dateStart)) errors.push('Date de début invalide');

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  return {
    isEmail: isEmail,
    isDate: isDate,
    isNonEmptyString: isNonEmptyString,
    isPositiveNumber: isPositiveNumber,
    validateReservation: validateReservation
  };

})();
