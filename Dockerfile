FROM node:18-alpine

# Installer les dépendances système si nécessaire
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances Node.js
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001
USER botuser

# Démarrer l'application
CMD ["node", "bot.js"]
