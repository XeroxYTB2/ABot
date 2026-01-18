FROM node:18-alpine

# Installer les dépendances système
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    openjdk17-jre \
    && npm config set python /usr/bin/python3

WORKDIR /app

# Copier les fichiers package d'abord pour meilleur caching
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste des fichiers
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p /app/logs /app/config

# Rendre les scripts exécutables
RUN chmod +x start.sh

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

# Exposer le port pour health checks
EXPOSE 8080

CMD ["./start.sh"]
