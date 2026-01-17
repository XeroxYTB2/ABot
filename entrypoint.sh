#!/bin/bash

# Accepter l'EULA si la variable EULA est définie
if [ "$EULA" = "TRUE" ]; then
    echo "eula=true" > eula.txt
fi

# Démarrer le serveur
exec java -Xmx2G -Xms1G -jar forge-1.20.1-47.2.0.jar nogui
