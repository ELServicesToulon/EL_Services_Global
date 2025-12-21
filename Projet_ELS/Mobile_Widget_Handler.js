/**
 * @fileoverview Backend handler for the Android Widget.
 * Provides configuration, URLs, and Folder IDs.
 */

function getWidgetConfig() {
    const scriptUrl = ScriptApp.getService().getUrl();

    // Hardcoded known deployment URL for App_Livreur (from previous context or config)
    // If possible, store this in ScriptProperties: 'URL_APP_LIVREUR'
    const props = PropertiesService.getScriptProperties().getProperties();
    const urlLivreur = props['URL_APP_LIVREUR'] || "https://script.google.com/macros/s/AKfycbyC1PWyq5xnYa3HaLtuRtahsnjpkiTryQxqy5jgYHrR6pDwLgAlkM3ecxjSAAgEOYWKGg/exec";

    // Drive Folders
    // We try to fetch human readable names if possible, otherwise use generic names
    const folders = [];

    // Helper to add folder if ID exists
    const addFolder = (key, label, icon) => {
        if (props[key]) {
            try {
                const url = "https://drive.google.com/drive/folders/" + props[key];
                folders.push({
                    label: label,
                    url: url,
                    icon: icon || "fp_folder" // Material icon name
                });
            } catch (e) {
                Logger.log("Error constructing folder URL for " + key);
            }
        }
    };

    addFolder('ID_DOSSIER_ARCHIVES', 'Archives', 'archive');
    addFolder('ID_DOSSIER_TEMPORAIRE', 'Dossier Temporaire', 'folder_open');

    // Tesla Reports (Hardcoded ID from App_Livreur/Tesla.js)
    folders.push({
        label: 'Rapports Tesla',
        url: 'https://drive.google.com/drive/folders/144qdIbP-njNmy-m6F425s6WxRjntN4yb',
        icon: 'electric_car'
    });
    // Add others if needed

    // We can also return raw IDs if the frontend wants to construct URLs, but server-side is safer.

    return {
        els_global: {
            url: scriptUrl,
            pages: [
                { id: 'home', label: 'Réservation (Home)', icon: 'home' },
                { id: 'admin', label: 'Administration', icon: 'admin_panel_settings' },
                { id: 'gestion', label: 'Espace Client', icon: 'people' },
                { id: 'piluleur', label: 'Piluleur', icon: 'medication' },
                { id: 'debug', label: 'Debug', icon: 'bug_report' },
                { id: 'infos', label: 'Infos', icon: 'info' }
            ]
        },
        app_livreur: {
            url: urlLivreur,
            pages: [
                { id: '', label: 'Livreur (App)', icon: 'local_shipping' }, // Empty id for root
                { id: 'tesla', label: 'Tesla Interface', icon: 'electric_car' }
            ]
        },
        folders: folders
    };
}
