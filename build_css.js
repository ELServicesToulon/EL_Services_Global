const fs = require('fs');
const { exec } = require('child_process');

console.log('🏗️  Construction du CSS Tailwind pour Apps Script...');

// 1. Générer le CSS minifié
exec('npx tailwindcss -i ./tailwind_input.css -o ./temp_output.css --minify', (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Erreur de build: ${error.message}`);
        return;
    }
    if (stderr) {
        // Tailwind écrit parfois des infos dans stderr, ce n'est pas toujours une erreur bloquante
        console.log(`ℹ️  Info Tailwind: ${stderr}`);
    }

    // 2. Lire le CSS généré
    try {
        const cssContent = fs.readFileSync('./temp_output.css', 'utf8');

        // 3. Envelopper dans des balises <style>
        const htmlContent = `<style>\n${cssContent}\n</style>`;

        // 4. Écrire le fichier final dans le dossier du projet Apps Script
        fs.writeFileSync('./Projet_ELS/CSS_Tailwind.html', htmlContent);

        // 5. Nettoyage
        fs.unlinkSync('./temp_output.css');

        console.log('✅ Succès ! Fichier généré : ./Projet_ELS/CSS_Tailwind.html');
        console.log(`📦 Taille : ${(htmlContent.length / 1024).toFixed(2)} KB`);

    } catch (err) {
        console.error(`❌ Erreur lors du packaging : ${err.message}`);
    }
});
