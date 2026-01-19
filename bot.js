const mineflayer = require('mineflayer');
require('dotenv').config();

// Configuration
const config = {
  host: process.env.MC_HOST || 'localhost',
  port: parseInt(process.env.MC_PORT) || 25565,
  username: process.env.MC_USERNAME || 'AFK_Bot',
  password: process.env.MC_PASSWORD || '',
  version: process.env.MC_VERSION || '1.20.1',
  auth: process.env.MC_AUTH || 'offline'
};

class UltraPersistentAFKBot {
  constructor() {
    this.bot = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Infinity;
    this.baseReconnectDelay = 15000; // 15 secondes de base
    this.isReconnecting = false;
    this.lastConnectionTime = 0;
    this.reconnectTimer = null;
    
    console.log(`[${new Date().toISOString()}] 🚀 Initialisation du bot AFK ultra-persistant...`);
    this.initializeBot();
  }

  async initializeBot() {
    try {
      // Attendre un peu avant la première connexion
      if (this.reconnectAttempts > 0) {
        const delay = this.calculateReconnectDelay();
        console.log(`[${new Date().toISOString()}] ⏳ Attente de ${delay/1000}s avant reconnexion...`);
        await this.sleep(delay);
      }
      
      this.createBotInstance();
      this.setupEventHandlers();
      this.lastConnectionTime = Date.now();
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Erreur d'initialisation:`, error.message);
      this.scheduleReconnect();
    }
  }

  calculateReconnectDelay() {
    // Délai exponentiel avec un maximum de 2 minutes
    const exponentialDelay = this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    const jitter = Math.random() * 5000; // Jitter aléatoire
    return Math.min(exponentialDelay, 120000) + jitter; // Max 2 minutes
  }

  createBotInstance() {
    console.log(`[${new Date().toISOString()}] 🔗 Connexion à ${config.host}:${config.port}...`);
    
    this.bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      version: config.version,
      auth: config.auth,
      hideErrors: false,
      checkTimeoutInterval: 60000, // Augmenté à 60 secondes
      connectTimeout: 30000, // Timeout de connexion de 30 secondes
      logErrors: true,
      viewDistance: 'tiny',
      chatLengthLimit: 256,
      colorsEnabled: false,
      defaultChatPatterns: false
    });
  }

  setupEventHandlers() {
    if (!this.bot) return;

    // Connexion réussie
    this.bot.once('login', () => {
      console.log(`[${new Date().toISOString()}] ✅ Connecté en tant que ${this.bot.username}`);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startUltraPersistentAFK();
    });

    // Échec de connexion initiale
    this.bot.once('error', (err) => {
      if (!this.bot._client.ended) {
        console.error(`[${new Date().toISOString()}] ❌ Erreur de connexion:`, err.message);
        this.scheduleReconnect();
      }
    });

    // Déconnexion du serveur
    this.bot.once('end', (reason) => {
      console.log(`[${new Date().toISOString()}] 🔌 Déconnecté: ${reason}`);
      this.handleDisconnection();
    });

    // Kicked du serveur
    this.bot.on('kicked', (reason) => {
      console.log(`[${new Date().toISOString()}] 🚫 Expulsé:`, reason);
      this.handleDisconnection();
    });

    // Timeout
    this.bot.on('timeout', () => {
      console.log(`[${new Date().toISOString()}] ⏰ Timeout de connexion`);
      this.handleDisconnection();
    });
  }

  handleDisconnection() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Nettoyer l'ancienne instance
    if (this.bot) {
      try {
        this.bot.end();
        this.bot.removeAllListeners();
      } catch (e) {}
      this.bot = null;
    }
    
    // Attendre que la session soit complètement fermée
    const timeSinceConnection = Date.now() - this.lastConnectionTime;
    const minWaitTime = timeSinceConnection < 10000 ? 10000 : 5000; // Attendre au moins 10s si connexion récente
    
    setTimeout(() => {
      this.initializeBot();
    }, minWaitTime);
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    console.log(`[${new Date().toISOString()}] 🔄 Reconnexion dans ${delay/1000}s (tentative ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.initializeBot();
    }, delay);
  }

  startUltraPersistentAFK() {
    console.log(`[${new Date().toISOString()}] 🎮 Démarrage du mode AFK ultra-persistant...`);
    
    // 1. Rotation anti-afk (toutes les 20-40 secondes)
    const rotationInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() * 0.5) - 0.25; // Petit mouvement vertical
        this.bot.look(yaw, pitch, false);
      }
    }, 20000 + Math.random() * 20000);

    // 2. Saut léger (toutes les 30-60 secondes)
    const jumpInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        this.bot.setControlState('jump', true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState('jump', false);
        }, 200);
      }
    }, 30000 + Math.random() * 30000);

    // 3. Déplacement occasionnel (toutes les 2-5 minutes)
    const movementInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        const directions = ['forward', 'back', 'left', 'right'];
        const direction = directions[Math.floor(Math.random() * 2)]; // Seulement avant/arrière
        
        this.bot.setControlState(direction, true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState(direction, false);
        }, 1000);
      }
    }, 120000 + Math.random() * 180000);

    // 4. Ping périodique pour maintenir la connexion
    const pingInterval = setInterval(() => {
      if (this.bot && this.bot._client) {
        try {
          // Envoyer un packet keep-alive
          this.bot._client.write('keep_alive', {
            keepAliveId: BigInt(Math.floor(Math.random() * 1000000))
          });
        } catch (e) {}
      }
    }, 15000);

    // Stocker les intervals pour nettoyage
    this.afkIntervals = [rotationInterval, jumpInterval, movementInterval, pingInterval];

    // Gérer le chat
    this.bot.on('message', (message) => {
      const text = message.toString().toLowerCase();
      if (text.includes(config.username.toLowerCase())) {
        console.log(`[${new Date().toISOString()}] 💬 Message détecté:`, message.toString());
      }
    });

    // Surveillance de la santé
    this.bot.on('health', () => {
      if (this.bot.food < 15) {
        console.log(`[${new Date().toISOString()}] ⚠️ Nourriture faible: ${this.bot.food}`);
      }
    });
  }

  cleanup() {
    // Nettoyer tous les intervals
    if (this.afkIntervals) {
      this.afkIntervals.forEach(interval => clearInterval(interval));
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.bot) {
      try {
        this.bot.end();
        this.bot.removeAllListeners();
      } catch (e) {}
      this.bot = null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Gestion robuste des arrêts
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] ⏹️ Arrêt propre du bot...`);
  if (global.botInstance) {
    global.botInstance.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${new Date().toISOString()}] ⏹️ Arrêt propre du bot...`);
  if (global.botInstance) {
    global.botInstance.cleanup();
  }
  process.exit(0);
});

// Redémarrage automatique en cas d'erreur
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] 💥 Exception non gérée:`, err);
  console.log(`[${new Date().toISOString()}] 🔄 Redémarrage dans 30 secondes...`);
  
  if (global.botInstance) {
    global.botInstance.cleanup();
  }
  
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] 🚀 Redémarrage du bot...`);
    global.botInstance = new UltraPersistentAFKBot();
  }, 30000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] ⚠️ Rejet de promesse non géré:`, reason);
});

// Démarrer le bot
console.log(`[${new Date().toISOString()}] 🎮 Configuration: ${config.host}:${config.port}, Utilisateur: ${config.username}`);
global.botInstance = new UltraPersistentAFKBot();
