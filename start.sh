#!/bin/sh
set -e

echo "========================================"
echo "🚀 Minecraft Forge AFK Bot"
echo "📅 $(date)"
echo "========================================"

# Attendre que tout soit prêt (important pour Railway)
sleep 2

# Afficher les infos système
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Java:"
java -version 2>&1 | head -3

# Vérifier les variables d'environnement
echo ""
echo "🔧 Configuration:"
echo "   Serveur: ${SERVER_HOST:-play.cubecraft.net}:${SERVER_PORT:-25565}"
echo "   Bot: ${BOT_USERNAME:-ForgeBot}"
echo "   Version: ${MINECRAFT_VERSION:-1.20.1}"
echo "   Auth: ${AUTH_TYPE:-offline}"

# Installer les dépendances si nécessaire
if [ -f "package.json" ]; then
    echo ""
    echo "📦 Vérification des dépendances..."
    npm ci --only=production
fi

# Créer la configuration si elle n'existe pas
if [ ! -f "config.json" ]; then
    echo ""
    echo "⚙️  Création config.json..."
    cat > config.json << EOF
{
  "host": "${SERVER_HOST:-play.cubecraft.net}",
  "port": ${SERVER_PORT:-25565},
  "username": "${BOT_USERNAME:-ForgeBot}",
  "version": "${MINECRAFT_VERSION:-1.20.1}",
  "auth": "${AUTH_TYPE:-offline}",
  "forge": true,
  "forgeMods": ["create", "jei", "journeymap", "flywheel"],
  "autoReconnect": true,
  "reconnectDelay": 30000
}
EOF
fi

echo ""
echo "========================================"
echo "🤖 Démarrage du bot..."
echo "========================================"

# Démarrer le bot
exec node bot.js
