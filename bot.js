const mineflayer = require('mineflayer');
const minecraft = require('minecraft-protocol');
const path = require('path');

// Configuration
const CONFIG = {
  host: process.env.SERVER_HOST || 'play.example.com',
  port: parseInt(process.env.SERVER_PORT) || 25565,
  username: process.env.BOT_USERNAME || 'CreateAFKBot',
  version: process.env.MINECRAFT_VERSION || '1.20.1',
  auth: process.env.AUTH_TYPE || 'offline', // 'mojang', 'microsoft', or 'offline'
  viewDistance: 'tiny',
  chatLengthLimit: 256,
  forge: true, // CRITIQUE: Activer Forge
  forgeMods: ['create', 'jei', 'journeymap'] // Mods attendus
};

class ForgeBot {
  constructor(config) {
    this.config = config;
    this.bot = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.afkInterval = null;
  }

  async start() {
    console.log('🚀 Démarrage du bot Forge pour Create...');
    
    const options = {
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      version: this.config.version,
      auth: this.config.auth,
      
      // CONFIGURATION CRITIQUE POUR FORGE
      viewDistance: this.config.viewDistance,
      chatLengthLimit: this.config.chatLengthLimit,
      
      // Options spécifiques Forge
      forge: this.config.forge ? {
        forgeMods: this.config.forgeMods || []
      } : undefined,
      
      // Désactiver certaines validations pour Forge
      validateChannelProtocol: false,
      skipValidation: true,
      
      // Options de connexion
      connectTimeout: 30 * 1000, // 30 secondes
      keepAlive: true
    };

    // Ajouter email/password si auth type nécessite
    if (this.config.auth === 'microsoft' || this.config.auth === 'mojang') {
      if (process.env.MINECRAFT_EMAIL && process.env.MINECRAFT_PASSWORD) {
        options.password = process.env.MINECRAFT_PASSWORD;
        options.email = process.env.MINECRAFT_EMAIL;
      }
    }

    console.log('Options de connexion:', { 
      host: options.host, 
      port: options.port, 
      username: options.username,
      version: options.version,
      hasForge: !!options.forge
    });

    try {
      this.bot = mineflayer.createBot(options);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ Erreur création bot:', error);
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    // Événement de connexion réussie
    this.bot.on('login', () => {
      console.log(`✅ ${this.config.username} connecté à ${this.config.host}:${this.config.port}`);
      this.reconnectAttempts = 0;
      
      // Attendre un peu avant d'envoyer des commandes
      setTimeout(() => {
        this.performPostLoginActions();
      }, 3000);
    });

    // Événement Forge (CRITIQUE)
    this.bot.on('forgeHandshake', (data) => {
      console.log('🤝 Handshake Forge réussi!');
      console.log('📦 Mods serveur:', data.modList?.map(m => `${m.modid}@${m.version}`).join(', ') || 'Aucun mod détecté');
    });

    // Détection spécifique du mod Create
    this.bot.on('pluginMessage', (channel, data) => {
      if (channel === 'fml:handshake' || channel === 'forge:handshake') {
        console.log('🔧 Message plugin Forge reçu sur channel:', channel);
      }
      
      // Détection spécifique de Create
      if (channel.includes('create') || channel.includes('flywheel')) {
        console.log(`🏗️  Mod Create détecté sur channel: ${channel}`);
      }
    });

    // Réception de la liste des mods
    this.bot._client.on('mod_list', (packet) => {
      console.log(`📋 Liste des mods reçue (${packet.modpacks?.length || 0} mods):`);
      if (packet.modpacks) {
        packet.modpacks.forEach(mod => {
          if (mod.id.toLowerCase().includes('create')) {
            console.log(`   🏗️  CREATE DÉTECTÉ: ${mod.id} v${mod.version}`);
          }
        });
      }
    });

    // Une fois spawné dans le monde
    this.bot.on('spawn', () => {
      console.log('🌍 Spawn dans le monde');
      this.startAFKMode();
    });

    // Messages du serveur
    this.bot.on('message', (jsonMsg) => {
      const message = jsonMsg.toString();
      console.log(`💬 Message: ${message}`);
      
      // Répondre aux messages importants
      if (message.includes('forge') || message.includes('Forge')) {
        this.bot.chat('✅ Client Forge 1.20.1 actif');
      }
      
      if (message.includes('create') || message.includes('Create')) {
        this.bot.chat('✅ Mod Create supporté');
      }
    });

    // Gestion des kicks
    this.bot.on('kicked', (reason, loggedIn) => {
      console.log(`🚫 Expulsé: ${reason}`);
      
      // Analyser le message d'erreur
      if (reason.includes('Forge') || reason.includes('forge')) {
        console.log('⚠️  Erreur Forge détectée, ajustement de la configuration...');
      }
      
      this.scheduleReconnect();
    });

    // Erreurs
    this.bot.on('error', (err) => {
      console.error('❌ Erreur bot:', err.message);
      
      if (err.message.includes('mod')) {
        console.log('🔄 Tentative reconnexion avec configuration modifiée...');
      }
      
      this.scheduleReconnect();
    });

    // Déconnexion
    this.bot.on('end', () => {
      console.log('🔌 Déconnecté du serveur');
      this.cleanup();
      this.scheduleReconnect();
    });
  }

  performPostLoginActions() {
    console.log('🎮 Actions post-connexion...');
    
    // Envoyer des commandes AFK
    setTimeout(() => {
      this.bot.chat('/afk on');
    }, 1000);
    
    setTimeout(() => {
      this.bot.chat('Bot AFK Forge 1.20.1 actif');
    }, 2000);
    
    // Essayer de détecter les mods
    setTimeout(() => {
      this.bot.chat('/mods');
    }, 3000);
  }

  startAFKMode() {
    console.log('⏱️  Démarrage mode AFK...');
    
    // Nettoyer l'ancien intervalle
    if (this.afkInterval) {
      clearInterval(this.afkInterval);
    }
    
    // Mouvements anti-AFK
    this.afkInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        try {
          // Tourner légèrement
          const currentYaw = this.bot.entity.yaw;
          this.bot.look(currentYaw + 0.3, this.bot.entity.pitch, true);
          
          // Sauter aléatoirement (1 fois sur 3)
          if (Math.random() > 0.66) {
            this.bot.setControlState('jump', true);
            setTimeout(() => {
              this.bot.setControlState('jump', false);
            }, 100);
          }
          
          // Se déplacer occasionnellement
          if (Math.random() > 0.9) {
            this.bot.setControlState('forward', true);
            setTimeout(() => {
              this.bot.setControlState('forward', false);
            }, 200);
          }
          
          console.log('🔄 Mouvement AFK exécuté');
          
        } catch (error) {
          console.log('⚠️  Erreur mouvement AFK:', error.message);
        }
      }
    }, 20000); // Toutes les 20 secondes
    
    console.log('✅ Mode AFK activé');
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`❌ Maximum de reconnexions atteint (${this.maxReconnectAttempts})`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectAttempts * 10000, 60000); // Max 60 secondes
    
    console.log(`🔄 Reconnexion dans ${delay/1000}s (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      console.log('🔄 Tentative de reconnexion...');
      this.cleanup();
      this.start();
    }, delay);
  }

  cleanup() {
    if (this.afkInterval) {
      clearInterval(this.afkInterval);
      this.afkInterval = null;
    }
    
    if (this.bot) {
      try {
        this.bot.end();
      } catch (error) {
        // Ignorer les erreurs de déconnexion
      }
      this.bot = null;
    }
  }
}

// Health check server
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      bot: botInstance ? 'connected' : 'disconnected'
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🌐 Health check sur http://0.0.0.0:${PORT}/health`);
});

// Démarrer le bot
let botInstance = null;

async function main() {
  botInstance = new ForgeBot(CONFIG);
  await botInstance.start();
}

main().catch(error => {
  console.error('❌ Erreur démarrage bot:', error);
  process.exit(1);
});

// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🔴 Arrêt demandé...');
  if (botInstance) {
    botInstance.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔴 Arrêt Railway...');
  if (botInstance) {
    botInstance.cleanup();
  }
  process.exit(0);
});
