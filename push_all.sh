#!/bin/bash

# This script pushes all Google Apps Script projects in the repository.

set -e # Exit immediately if a command exits with a non-zero status.

PROJECT_DIRS=("App_Livreur" "App_Resideur" "Projet_ELS")

for dir in "${PROJECT_DIRS[@]}"; do
  echo "Pushing project in $dir..."
  (cd "$dir" && clasp push)
  echo "Successfully pushed $dir"
done

echo "All projects pushed successfully."
