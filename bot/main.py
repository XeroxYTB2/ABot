import asyncio
import json
import os
import sys
import time
from flask import Flask
from threading import Thread
from minecraft_bot import MinecraftBot
from mod_downloader import ModDownloader

app = Flask(__name__)

# Route de santé pour Railway
@app.route('/health')
def health_check():
    return 'OK', 200

class AFKManager:
    def __init__(self):
        self.bots = []
        self.config_path = 'config/servers.json'
        self.load_config()
        
    def load_config(self):
        """Charger la configuration des serveurs"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
        else:
            # Configuration par défaut
            self.config = {
                "servers": [
                    {
                        "name": "MonServeurForge",
                        "host": "votre-serveur.minecraft.com",
                        "port": 25565,
                        "version": "1.20.1",
                        "username": "BotAFK",
                        "auth": "offline",
                        "auto_reconnect": True,
                        "reconnect_delay": 30
                    }
                ],
                "check_interval": 300,
                "enable_mod_autodownload": True
            }
            os.makedirs('config', exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=4)
    
    async def start_bots(self):
        """Démarrer tous les bots"""
        print(f"Démarrage de {len(self.config['servers'])} bot(s)...")
        
        for server_config in self.config['servers']:
            bot = MinecraftBot(server_config)
            
            # Télécharger Forge et les mods si activé
            if self.config.get('enable_mod_autodownload', True):
                downloader = ModDownloader(
                    minecraft_version=server_config['version'],
                    mods_folder='/app/mods'
                )
                
                # Installer Forge
                print(f"Installation de Forge pour {server_config['version']}...")
                forge_path = await downloader.install_forge()
                if forge_path:
                    print(f"Forge installé : {forge_path}")
                
                # Tenter de détecter et télécharger les mods
                print("Détection des mods requis...")
                # Cette partie nécessiterait une connexion au serveur pour détecter les mods
                # Pour l'instant, on utilise une liste manuelle
                
            # Démarrer le bot
            self.bots.append(bot)
            asyncio.create_task(self.run_bot(bot))
    
    async def run_bot(self, bot):
        """Exécuter un bot avec reconnection automatique"""
        while True:
            try:
                await bot.connect()
                print(f"Bot {bot.username} connecté à {bot.host}:{bot.port}")
                
                # Rester connecté jusqu'à déconnexion
                while bot.is_connected:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                print(f"Erreur avec le bot {bot.username}: {e}")
            
            # Reconnection si configuré
            if bot.auto_reconnect:
                delay = bot.reconnect_delay
                print(f"Reconnexion dans {delay} secondes...")
                await asyncio.sleep(delay)
            else:
                break
    
    async def monitor_bots(self):
        """Surveiller l'état des bots"""
        while True:
            for i, bot in enumerate(self.bots):
                status = "connecté" if bot.is_connected else "déconnecté"
                print(f"Bot {i+1} ({bot.username}) : {status}")
            
            await asyncio.sleep(60)

def run_flask():
    """Démarrer le serveur Flask pour les health checks"""
    app.run(host='0.0.0.0', port=8080)

async def main():
    # Démarrer Flask dans un thread séparé
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # Démarrer le gestionnaire de bots
    manager = AFKManager()
    
    # Démarrer les bots
    await manager.start_bots()
    
    # Surveiller les bots
    await manager.monitor_bots()

if __name__ == '__main__':
    asyncio.run(main())
