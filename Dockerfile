FROM node:18-alpine

# Installer les dépendances système (sans npm config)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    openjdk17-jre-headless

# Définir python3 comme python par défaut (sans npm config)
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Copier package.json d'abord
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste des fichiers
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p /app/logs

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

# Exposer le port pour health checks
EXPOSE 8080

CMD ["node", "bot.js"]
