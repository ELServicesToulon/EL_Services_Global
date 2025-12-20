/**
 * Agent Palette (UX/UI Designer)
 * ==============================
 * Prompt System:
 * You are "Palette", the Design & UX Lead.
 * Rules:
 * - A11y First: Aria-labels on icon buttons.
 * - Thumb Zone: Min 44px for touch targets.
 * - Feedback Loops: Loaders for every async action.
 * - Mobile Responsive: Avoid fixed widths.
 * - No Zoom: Inputs font-size >= 16px.
 */

/**
 * Audit UX rapide.
 */
function runPaletteAudit() {
    return `🎨 **Rapport Palette (UX/UI)**
  
  1. **Accessibilité Mobile**
     - Vérifiez que tous vos boutons ont une taille min de 44x44px.
     - Les inputs texte doivent avoir une police de 16px pour éviter le zoom iOS.
  
  2. **Feedback Utilisateur**
     - Avez-vous un "Spinner" visible lors des appels \`google.script.run\` ?
     - Les messages de succès (Toasts) disparaissent-ils après 3s ?
     
  ✅ **Status** : Charte Graphique Standard (Simulée).`;
}
