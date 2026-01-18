FROM python:3.11-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    openjdk-17-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers de configuration
COPY requirements.txt .
COPY start.sh .
COPY bot/ ./bot/
COPY config/ ./config/

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Créer les répertoires nécessaires
RUN mkdir -p /app/minecraft /app/mods /app/logs

# Donner les permissions
RUN chmod +x start.sh

CMD ["./start.sh"]
