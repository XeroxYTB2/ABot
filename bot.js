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

// Variables globales pour éviter les instances multiples
let botInstance = null;
let reconnectTimer = null;
let isShuttingDown = false;
let connectionAttempts = 0;

class AFKBot {
  constructor() {
    this.bot = null;
    this.afkIntervals = [];
    this.isConnected = false;
    this.lastActivity = Date.now();
  }

  async connect() {
    try {
      connectionAttempts++;
      console.log(`[${this.getTimestamp()}] 🔗 Tentative de connexion #${connectionAttempts} à ${config.host}:${config.port}`);
      
      // Annuler toute tentative de reconnexion précédente
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Attendre avant de se connecter (backoff exponentiel)
      const waitTime = this.calculateWaitTime();
      if (connectionAttempts > 1) {
        console.log(`[${this.getTimestamp()}] ⏳ Attente de ${waitTime/1000}s avant connexion...`);
        await this.sleep(waitTime);
      }
      
      this.bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        version: config.version,
        auth: config.auth,
        hideErrors: true,
        checkTimeoutInterval: 30000,
        connectTimeout: 45000,
        keepAlive: true,
        closeTimeout: 30000,
        noPongTimeout: 30000
      });
      
      this.setupEventHandlers();
      
    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Erreur lors de la création du bot:`, error.message);
      this.scheduleReconnect();
    }
  }

  calculateWaitTime() {
    // Backoff exponentiel avec un maximum de 120 secondes
    const baseDelay = 15000; // 15 secondes de base
    const maxDelay = 120000; // 2 minutes maximum
    const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, connectionAttempts - 1), maxDelay);
    
    // Ajouter un délai aléatoire pour éviter les patterns
    const jitter = Math.random() * 10000; // Jusqu'à 10 secondes de jitter
    return exponentialDelay + jitter;
  }

  setupEventHandlers() {
    // Connexion réussie
    this.bot.once('login', () => {
      console.log(`[${this.getTimestamp()}] ✅ Connecté en tant que ${this.bot.username} (ID: ${this.bot.entity.id})`);
      connectionAttempts = 0;
      this.isConnected = true;
      this.lastActivity = Date.now();
      this.startAFKRoutine();
    });

    // Déjà connecté (événement secondaire)
    this.bot.on('login', () => {
      console.log(`[${this.getTimestamp()}] 🔄 Session maintenue pour ${this.bot.username}`);
    });

    // Erreur de connexion
    this.bot.once('error', (err) => {
      if (!this.isConnected) {
        console.error(`[${this.getTimestamp()}] ❌ Erreur de connexion:`, err.message);
        this.cleanup();
        this.scheduleReconnect();
      }
    });

    // Déconnexion
    this.bot.once('end', (reason) => {
      console.log(`[${this.getTimestamp()}] 🔌 Déconnecté: ${reason}`);
      this.isConnected = false;
      this.cleanup();
      this.scheduleReconnect();
    });

    // Kicked
    this.bot.on('kicked', (reason) => {
      console.log(`[${this.getTimestamp()}] 🚫 Expulsé:`, JSON.stringify(reason));
      this.isConnected = false;
      this.cleanup();
      
      // Attendre plus longtemps si c'est un duplicate login
      if (reason && reason.translate && reason.translate.includes('duplicate')) {
        console.log(`[${this.getTimestamp()}] ⚠️ Connexion dupliquée détectée, attente prolongée...`);
        connectionAttempts = Math.max(connectionAttempts, 3); // Augmenter le compteur
      }
      
      this.scheduleReconnect();
    });

    // Timeout
    this.bot.on('timeout', () => {
      console.log(`[${this.getTimestamp()}] ⏰ Timeout de connexion`);
      this.isConnected = false;
      this.cleanup();
      this.scheduleReconnect();
    });

    // Écouter le chat pour le debug
    this.bot.on('message', (message) => {
      const text = message.toString();
      if (text.toLowerCase().includes(config.username.toLowerCase()) || 
          text.includes('AFK') || 
          text.includes('Bot')) {
        console.log(`[${this.getTimestamp()}] 💬 Chat:`, text);
      }
    });
  }

  startAFKRoutine() {
    console.log(`[${this.getTimestamp()}] 🎮 Démarrage des actions AFK...`);
    
    // Nettoyer les anciens intervalles
    this.clearIntervals();
    
    // 1. Rotation de la tête (toutes les 25-35 secondes)
    const rotationInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() * 0.4) - 0.2; // Mouvement limité
        this.bot.look(yaw, pitch, false);
        this.lastActivity = Date.now();
      }
    }, 25000 + Math.random() * 10000);
    this.afkIntervals.push(rotationInterval);
    
    // 2. Saut léger (toutes les 45-75 secondes)
    const jumpInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        this.bot.setControlState('jump', true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState('jump', false);
        }, 150);
        this.lastActivity = Date.now();
      }
    }, 45000 + Math.random() * 30000);
    this.afkIntervals.push(jumpInterval);
    
    // 3. Mouvement occasionnel (toutes les 90-180 secondes)
    const movementInterval = setInterval(() => {
      if (this.bot && this.bot.entity) {
        const directions = ['forward', 'back'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        this.bot.setControlState(direction, true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState(direction, false);
        }, 800);
        this.lastActivity = Date.now();
      }
    }, 90000 + Math.random() * 90000);
    this.afkIntervals.push(movementInterval);
    
    // 4. Vérification périodique de la connexion
    const healthCheckInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      if (timeSinceActivity > 120000) { // 2 minutes sans activité
        console.log(`[${this.getTimestamp()}] 🩹 Vérification de santé de la connexion...`);
        // Simuler une activité
        if (this.bot && this.bot.entity) {
          this.bot.look(Math.random() * Math.PI, 0, false);
          this.lastActivity = Date.now();
        }
      }
      
      // Vérifier si le bot est toujours connecté
      if (this.bot && this.bot._client && this.bot._client.ended) {
        console.log(`[${this.getTimestamp()}] ⚠️ Connexion perdue détectée, reconnexion...`);
        this.isConnected = false;
        this.cleanup();
        this.scheduleReconnect();
      }
    }, 30000);
    this.afkIntervals.push(healthCheckInterval);
    
    console.log(`[${this.getTimestamp()}] ✅ ${this.afkIntervals.length} actions AFK programmées`);
  }

  scheduleReconnect() {
    if (isShuttingDown) return;
    
    // Nettoyer le timer précédent
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    const delay = this.calculateWaitTime();
    console.log(`[${this.getTimestamp()}] 🔄 Reconnexion dans ${Math.round(delay/1000)}s...`);
    
    reconnectTimer = setTimeout(() => {
      console.log(`[${this.getTimestamp()}] 🔄 Tentative de reconnexion...`);
      this.connect();
    }, delay);
  }

  cleanup() {
    // Nettoyer les intervalles
    this.clearIntervals();
    
    // Déconnecter le bot proprement
    if (this.bot) {
      try {
        // Supprimer tous les écouteurs
        this.bot.removeAllListeners();
        
        // Fermer la connexion
        if (this.bot._client && !this.bot._client.ended) {
          this.bot._client.end();
        }
        
        this.bot = null;
      } catch (error) {
        console.error(`[${this.getTimestamp()}] ❌ Erreur lors du nettoyage:`, error.message);
      }
    }
    
    this.isConnected = false;
  }

  clearIntervals() {
    if (this.afkIntervals && this.afkIntervals.length > 0) {
      this.afkIntervals.forEach(interval => clearInterval(interval));
      this.afkIntervals = [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getTimestamp() {
    return new Date().toISOString();
  }
}

// Gestion globale du processus
async function startBot() {
  console.log(`[${new Date().toISOString()}] 🚀 Démarrage du bot AFK persistant...`);
  console.log(`[${new Date().toISOString()}] 📍 Serveur: ${config.host}:${config.port}`);
  console.log(`[${new Date().toISOString()}] 👤 Utilisateur: ${config.username}`);
  console.log(`[${new Date().toISOString()}] 🔐 Mode: ${config.auth}`);
  
  // S'assurer qu'une seule instance tourne
  if (botInstance) {
    console.log(`[${new Date().toISOString()}] ⚠️ Instance déjà en cours, nettoyage...`);
    botInstance.cleanup();
    botInstance = null;
  }
  
  // Créer et démarrer la nouvelle instance
  botInstance = new AFKBot();
  await botInstance.connect();
}

// Gestion des signaux d'arrêt
function shutdown(signal) {
  return () => {
    console.log(`\n[${new Date().toISOString()}] ${signal} reçu, arrêt en cours...`);
    isShuttingDown = true;
    
    // Nettoyer le timer de reconnexion
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    // Nettoyer l'instance du bot
    if (botInstance) {
      botInstance.cleanup();
      botInstance = null;
    }
    
    console.log(`[${new Date().toISOString()}] 👋 Arrêt complet`);
    process.exit(0);
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] 💥 Exception non capturée:`, error.message);
  console.error(error.stack);
  
  if (!isShuttingDown) {
    console.log(`[${new Date().toISOString()}] 🔄 Redémarrage dans 30 secondes...`);
    setTimeout(startBot, 30000);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] ⚠️ Rejet de promesse non géré:`, reason);
});

// Démarrer le bot
startBot().catch(error => {
  console.error(`[${new Date().toISOString()}] ❌ Échec du démarrage:`, error.message);
  console.error(error.stack);
  process.exit(1);
});
