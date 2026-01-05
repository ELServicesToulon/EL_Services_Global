FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Optimisation du cache des couches
COPY package.json .
RUN npm install

COPY . .

# On lance le worker
CMD ["node", "index.js"]
