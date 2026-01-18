FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Installation des dépendances
RUN apk add --no-cache curl

# Copie des scripts
COPY start.sh .
COPY mods.txt .

# Donne les permissions d'exécution
RUN chmod +x start.sh

# Port exposé (port Minecraft par défaut)
EXPOSE 25565

# Volume pour les données persistantes
VOLUME ["/app/world", "/app/logs", "/app/config", "/app/mods"]

# Commande de démarrage
CMD ["./start.sh"]
