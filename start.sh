#!/bin/bash

# Attendre un peu pour éviter les problèmes de démarrage
sleep 2

# Vérifier si Java est installé
java -version

# Créer les dossiers nécessaires
mkdir -p /app/minecraft
mkdir -p /app/mods
mkdir -p /app/logs

# Lancer le bot
cd /app
python -m bot.main
