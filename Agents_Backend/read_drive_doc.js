const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json'); // Adjusted path based on file location
const DOC_ID = '1dtN-RG34Mw2l7U3rM56FHUPcNDoj3BIDmYbdU_VfDh8';

async function readDoc() {
    try {
        // Authenticate
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/documents.readonly'],
        });

        const docs = google.docs({ version: 'v1', auth });

        console.log(`Fetching document content for ID: ${DOC_ID}...`);
        
        const res = await docs.documents.get({
            documentId: DOC_ID,
        });

        const content = res.data.body.content;
        let fullText = '';

        content.forEach(element => {
            if (element.paragraph) {
                element.paragraph.elements.forEach(el => {
                    if (el.textRun) {
                        fullText += el.textRun.content;
                    }
                });
            }
        });

        // Save locally for analysis
        const outputPath = path.join(__dirname, 'google_doc_content.txt');
        fs.writeFileSync(outputPath, fullText);
        
        console.log("--- DOCUMENT CONTENT ---");
        console.log(fullText);
        console.log("------------------------");
        console.log(`Saved to ${outputPath}`);
        
    } catch (error) {
        console.error('Error reading document:', error.message);
        if (error.code === 403 || error.code === 401) {
             console.error("PERMISSION ERROR: The service account (antigravity-core-to-drive@gestion-els.iam.gserviceaccount.com) likely hasn't been given access to this specific file.");
        }
    }
}

readDoc();
