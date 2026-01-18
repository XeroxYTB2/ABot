FROM node:18-alpine

# Installer Java pour Minecraft
RUN apk add --no-cache openjdk17-jre-headless

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances PRODUCTION uniquement
RUN npm ci --omit=dev

# Copier le code source
COPY . .

# Port pour health check Railway
EXPOSE 8080

# Démarrer l'application
CMD ["node", "bot.js"]
