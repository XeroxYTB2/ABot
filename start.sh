#!/bin/bash
set -e

echo "=== Installation de Forge 1.20.1 ==="

# Création des dossiers nécessaires
mkdir -p mods config

# Téléchargement et installation de Forge
FORGE_VERSION="47.2.0"
MINECRAFT_VERSION="1.20.1"
FORGE_INSTALLER="forge-${MINECRAFT_VERSION}-${FORGE_VERSION}-installer.jar"
FORGE_SERVER="forge-${MINECRAFT_VERSION}-${FORGE_VERSION}.jar"

echo "Téléchargement de Forge ${FORGE_VERSION}..."
if [ ! -f "$FORGE_INSTALLER" ]; then
    curl -o "$FORGE_INSTALLER" "https://maven.minecraftforge.net/net/minecraftforge/forge/${MINECRAFT_VERSION}-${FORGE_VERSION}/forge-${MINECRAFT_VERSION}-${FORGE_VERSION}-installer.jar"
fi

echo "Installation de Forge..."
if [ ! -f "$FORGE_SERVER" ]; then
    java -jar "$FORGE_INSTALLER" --installServer
    rm -f "$FORGE_INSTALLER"  # Supprime l'installateur après installation
fi

# Vérification et création du fichier mods.txt s'il n'existe pas
if [ ! -f "mods.txt" ]; then
    echo "# Liste des mods à télécharger automatiquement" > mods.txt
    echo "# Format: URL|nom_du_fichier.jar" >> mods.txt
    echo "# Exemple:" >> mods.txt
    echo "# https://example.com/mod.jar|mon_mod.jar" >> mods.txt
    echo "" >> mods.txt
    echo "=== Mods par défaut (optionnels) ===" >> mods.txt
    echo "# https://cdn.modrinth.com/data/UQEiJai8/versions/jHnOQpN8/jei-1.20.1-forge-15.2.0.27.jar|jei-1.20.1-forge-15.2.0.27.jar" >> mods.txt
    echo "# https://cdn.modrinth.com/data/u6dRKJwZ/versions/15.0.8/JourneyMap-1.20.1-5.9.18-forge.jar|JourneyMap-1.20.1-5.9.18-forge.jar" >> mods.txt
fi

# Téléchargement des mods depuis mods.txt
if [ -f "mods.txt" ]; then
    echo "=== Téléchargement des mods ==="
    while IFS='|' read -r url filename || [ -n "$url" ]; do
        # Ignore les lignes commentées ou vides
        if [[ -z "$url" || "$url" =~ ^# ]]; then
            continue
        fi
        
        # Supprime les espaces
        url=$(echo "$url" | tr -d '[:space:]')
        filename=$(echo "$filename" | tr -d '[:space:]')
        
        if [ -n "$url" ] && [ -n "$filename" ]; then
            if [ ! -f "mods/$filename" ]; then
                echo "Téléchargement: $filename"
                curl -L -o "mods/$filename" "$url"
                
                if [ $? -eq 0 ]; then
                    echo "✓ Téléchargement réussi: $filename"
                else
                    echo "✗ Erreur lors du téléchargement: $filename"
                fi
            else
                echo "✓ Mod déjà présent: $filename"
            fi
        fi
    done < mods.txt
fi

# Vérification et création du fichier eula.txt
if [ ! -f "eula.txt" ]; then
    echo "=== Configuration EULA ==="
    echo "eula=true" > eula.txt
    echo "EULA accepté automatiquement pour Railway"
fi

# Configuration automatique du server.properties si absent
if [ ! -f "server.properties" ]; then
    echo "=== Configuration du serveur ==="
    cat > server.properties << EOF
#Minecraft server properties
generator-settings=
op-permission-level=4
allow-nether=true
level-name=world
enable-query=false
allow-flight=false
announce-player-achievements=true
server-port=25565
max-world-size=29999984
level-type=default
enable-rcon=false
level-seed=
force-gamemode=false
server-ip=
network-compression-threshold=256
max-build-height=256
spawn-npcs=true
white-list=false
spawn-animals=true
hardcore=false
snooper-enabled=true
resource-pack-sha1=
online-mode=false
resource-pack=
pvp=true
difficulty=easy
enable-command-block=true
gamemode=0
player-idle-timeout=0
max-players=20
max-tick-time=60000
spawn-monsters=true
view-distance=10
generate-structures=true
motd=Forge 1.20.1 Server on Railway
EOF
fi

# Allocation mémoire automatique basée sur la mémoire disponible
MEMORY_LIMIT=$(($(awk '/MemAvailable/ {printf "%.0f", $2/1024/1024}' /proc/meminfo 2>/dev/null || echo 1) - 500))
if [ "$MEMORY_LIMIT" -lt 1024 ]; then
    MEMORY_LIMIT=1024
fi
MAX_RAM="${MEMORY_LIMIT}M"

echo "=== Démarrage du serveur Forge ==="
echo "Mémoire allouée: ${MAX_RAM}"

# Options JVM optimisées pour Forge
JVM_OPTS="-Xms1024M -Xmx${MAX_RAM} -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true"

# Démarrage du serveur Forge
echo "Lancement: java $JVM_OPTS -jar $FORGE_SERVER nogui"
java $JVM_OPTS -jar "$FORGE_SERVER" nogui
