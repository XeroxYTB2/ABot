from mineflayer import Bot
import asyncio
import aiohttp
from typing import Optional

class MinecraftBot:
    def __init__(self, config):
        self.host = config.get('host', 'localhost')
        self.port = config.get('port', 25565)
        self.username = config.get('username', 'BotAFK')
        self.auth = config.get('auth', 'offline')
        self.version = config.get('version', '1.20.1')
        self.auto_reconnect = config.get('auto_reconnect', True)
        self.reconnect_delay = config.get('reconnect_delay', 30)
        
        self.bot: Optional[Bot] = None
        self.is_connected = False
        self.session = None
        
    async def connect(self):
        """Se connecter au serveur Minecraft"""
        try:
            # Créer une nouvelle session
            self.session = aiohttp.ClientSession()
            
            # Configuration de Mineflayer
            options = {
                'host': self.host,
                'port': self.port,
                'username': self.username,
                'auth': self.auth,
                'version': self.version,
                'hideErrors': False
            }
            
            # Créer le bot
            self.bot = Bot(options)
            
            # Configurer les événements
            self.setup_events()
            
            # Attendre la connexion
            await self.wait_for_connection()
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Erreur de connexion: {e}")
            self.is_connected = False
            raise
    
    def setup_events(self):
        """Configurer les événements du bot"""
        if not self.bot:
            return
        
        @self.bot.on('login')
        def on_login():
            print(f"✅ Connecté en tant que {self.username}")
            self.is_connected = True
            
            # Actions après connexion
            self.bot.chat('/afk on')
            
            # Se déplacer légèrement pour éviter le kick AFK
            self.setup_afk_movement()
        
        @self.bot.on('end')
        def on_end():
            print("🔌 Déconnecté du serveur")
            self.is_connected = False
        
        @self.bot.on('kicked')
        def on_kicked(reason):
            print(f"🚫 Expulsé: {reason}")
            self.is_connected = False
        
        @self.bot.on('error')
        def on_error(err):
            print(f"❌ Erreur: {err}")
            self.is_connected = False
    
    def setup_afk_movement(self):
        """Configurer le mouvement anti-AFK"""
        async def move_afk():
            while self.is_connected and self.bot:
                try:
                    # Tourner légèrement
                    yaw = self.bot.entity.yaw or 0
                    self.bot.look(yaw + 0.1, self.bot.entity.pitch)
                    
                    # Sauter occasionnellement
                    if hasattr(self.bot, 'control'):
                        self.bot.setControlState('jump', True)
                        await asyncio.sleep(0.1)
                        self.bot.setControlState('jump', False)
                    
                    # Attendre avant le prochain mouvement
                    await asyncio.sleep(20)
                    
                except Exception as e:
                    print(f"Erreur mouvement AFK: {e}")
                    break
        
        # Démarrer la tâche de mouvement
        asyncio.create_task(move_afk())
    
    async def wait_for_connection(self, timeout=30):
        """Attendre la connexion avec timeout"""
        start_time = asyncio.get_event_loop().time()
        
        while not self.is_connected:
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError("Timeout de connexion")
            await asyncio.sleep(0.1)
    
    async def disconnect(self):
        """Se déconnecter proprement"""
        if self.bot:
            self.bot.quit()
            self.is_connected = False
        
        if self.session:
            await self.session.close()
