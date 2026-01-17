# Solution 1 : Eclipse Temurin (recommandé)
FROM eclipse-temurin:17-jdk-alpine

# Solution 2 : OpenJDK officiel
# FROM openjdk:17-jdk-alpine

# Solution 3 : Amazon Corretto
# FROM amazoncorretto:17-alpine-jdk

# Définir le répertoire de travail
WORKDIR /app

# Mettre à jour et installer wget
RUN apk update && apk add --no-cache wget bash

# Variables d'environnement
ARG MINECRAFT_VERSION=1.20.1
ARG FORGE_VERSION=47.2.0

# Télécharger Forge
RUN wget -O forge-installer.jar \
    "https://maven.minecraftforge.net/net/minecraftforge/forge/${MINECRAFT_VERSION}-${FORGE_VERSION}/forge-${MINECRAFT_VERSION}-${FORGE_VERSION}-installer.jar"

# Installer Forge
RUN java -jar forge-installer.jar --installServer --verbose

# Nettoyer
RUN rm forge-installer.jar

# Copier les fichiers nécessaires
COPY mods/ ./mods/
COPY config/ ./config/
COPY server.properties ./
COPY eula.txt ./

# Exposer le port
EXPOSE 25565

# Démarrer le serveur
CMD ["java", "-Xms1G", "-Xmx2G", "-jar", "forge-1.20.1-47.2.0.jar", "nogui"]
