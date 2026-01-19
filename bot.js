const mineflayer = require('mineflayer');
require('dotenv').config();

// Configuration depuis les variables d'environnement (Railway)
const config = {
  host: process.env.MC_HOST || 'localhost',
  port: parseInt(process.env.MC_PORT) || 25565,
  username: process.env.MC_USERNAME || 'AFK_Bot',
  password: process.env.MC_PASSWORD || '',
  version: process.env.MC_VERSION || '1.20.1',
  auth: process.env.MC_AUTH || 'microsoft' // ou 'mojang' ou 'offline'
};

class PersistentAFKBot {
  constructor() {
    this.bot = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 1000; // Très grand nombre pour persistance
    this.reconnectDelay = 5000; // 5 secondes
    
    this.createBot();
    this.setupEventHandlers();
  }

  createBot() {
    console.log(`[${new Date().toISOString()}] Tentative de connexion...`);
    
    this.bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      version: config.version,
      auth: config.auth,
      hideErrors: false,
      checkTimeoutInterval: 30000, // Vérifie la connexion toutes les 30s
      logErrors: true
    });
  }

  setupEventHandlers() {
    if (!this.bot) return;

    // Connexion réussie
    this.bot.on('login', () => {
      console.log(`[${new Date().toISOString()}] ✅ Connecté en tant que ${this.bot.username}`);
      this.reconnectAttempts = 0;
      this.startAFKActions();
    });

    // Gestion des erreurs
    this.bot.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] ❌ Erreur:`, err.message);
    });

    // Déconnexion
    this.bot.on('end', (reason) => {
      console.log(`[${new Date().toISOString()}] 🔌 Déconnecté:`, reason);
      this.handleReconnect();
    });

    // Kicked du serveur
    this.bot.on('kicked', (reason) => {
      console.log(`[${new Date().toISOString()}] 🚫 Kicked:`, reason);
      this.handleReconnect();
    });

    // Chat
    this.bot.on('message', (message) => {
      const text = message.toString();
      console.log(`[${new Date().toISOString()}] 💬 Chat:`, text);
    });

    // Santé
    this.bot.on('health', () => {
      if (this.bot.food < 10) {
        console.log(`[${new Date().toISOString()}] 🍖 Nourriture faible: ${this.bot.food}`);
      }
    });
  }

  startAFKActions() {
    if (!this.bot) return;

    console.log(`[${new Date().toISOString()}] 🚀 Démarrage des actions AFK...`);

    // 1. Rotation automatique (toutes les 30 secondes)
    setInterval(() => {
      if (this.bot && this.bot.entity) {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() * Math.PI) - Math.PI / 2;
        this.bot.look(yaw, pitch, false);
      }
    }, 30000);

    // 2. Saut aléatoire (toutes les 45-75 secondes)
    setInterval(() => {
      if (this.bot && this.bot.entity) {
        this.bot.setControlState('jump', true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState('jump', false);
        }, 500);
      }
    }, 45000 + Math.random() * 30000);

    // 3. Mouvement aléatoire (toutes les 60-120 secondes)
    setInterval(() => {
      if (this.bot && this.bot.entity) {
        const directions = ['forward', 'back', 'left', 'right'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        this.bot.setControlState(direction, true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState(direction, false);
        }, 2000 + Math.random() * 3000);
      }
    }, 60000 + Math.random() * 60000);

    // 4. Changement d'item dans la main (toutes les 90 secondes)
    setInterval(() => {
      if (this.bot && this.bot.inventory) {
        const items = this.bot.inventory.items();
        if (items.length > 0) {
          const randomItem = items[Math.floor(Math.random() * items.length)];
          this.bot.equip(randomItem, 'hand');
        }
      }
    }, 90000);

    // 5. Interaction avec l'environnement (toutes les 2-3 minutes)
    setInterval(() => {
      if (this.bot && this.bot.entity) {
        // Clic droit dans l'air
        this.bot.activateItem();
      }
    }, 120000 + Math.random() * 60000);

    console.log(`[${new Date().toISOString()}] ⏰ Actions AFK programmées`);
  }

  handleReconnect() {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log(`[${new Date().toISOString()}] ⚠️ Nombre maximum de tentatives atteint, redémarrage...`);
      this.reconnectAttempts = 0;
    }

    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 10);
    
    console.log(`[${new Date().toISOString()}] 🔄 Reconnexion dans ${delay/1000}s (tentative ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.createBot();
      this.setupEventHandlers();
    }, delay);
  }
}

// Gestion des arrêts propres
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] ⏹️ Arrêt en cours...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] ⏹️ Arrêt en cours...`);
  process.exit(0);
});

// Redémarrage automatique en cas de crash
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] 💥 Exception non gérée:`, err);
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] 🔄 Redémarrage après crash...`);
    new PersistentAFKBot();
  }, 10000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] ⚠️ Rejet non géré:`, reason);
});

// Démarrer le bot
console.log(`[${new Date().toISOString()}] 🎮 Démarrage du bot AFK persistant...`);
console.log(`[${new Date().toISOString()}] 📍 Serveur: ${config.host}:${config.port}`);
console.log(`[${new Date().toISOString()}] 👤 Utilisateur: ${config.username}`);

new PersistentAFKBot();
