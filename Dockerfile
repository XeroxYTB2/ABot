# Dockerfile
FROM openjdk:17-jdk-slim

# Définir le répertoire de travail
WORKDIR /forge

# Installer Forge
RUN apt-get update && apt-get install -y wget
RUN wget -O forge-installer.jar https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.2.0/forge-1.20.1-47.2.0-installer.jar
RUN java -jar forge-installer.jar --installServer

# Copier les mods et config
COPY mods/ ./mods/
COPY config/ ./config/

# Copier les fichiers du serveur (server.properties, etc.)
COPY server.properties ./
COPY eula.txt ./

# Créer le dossier world
RUN mkdir -p world

# Exposer le port
EXPOSE 25565

# Script d'entrée
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT [ "./entrypoint.sh" ]
