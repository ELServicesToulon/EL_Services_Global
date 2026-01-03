#!/bin/bash
set -e

echo "1. Cleaning previous dist..."
rm -rf V2_App/dist

echo "2. Building V2 App..."
cd V2_App
npm run build
cd ..

echo "3. Verifying build content..."
ls -l V2_App/dist/index.html
if grep -q "/src/main.jsx" V2_App/dist/index.html; then
    echo "ERROR: Build generated dev index.html!"
    exit 1
else
    echo "Build looks correct (no /src/main.jsx found)."
fi

echo "4. Deploying..."
node final_deploy_v2.js
