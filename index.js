const mineflayer = require('mineflayer');

console.log('🚀 Bot AFK pour serveur Aternos');
console.log('📡 Serveur cible:', process.env.SERVER_HOST);

let bot = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const aternosWaitTime = 60000; // 60 secondes minimum pour Aternos
let reconnectTimer = null;

// Fonction pour se connecter
function connectToServer() {
  if (isConnecting) {
    console.log('⚠️ Une connexion est déjà en cours, attente...');
    return;
  }
  
  isConnecting = true;
  reconnectAttempts++;
  
  console.log(`🔄 Tentative ${reconnectAttempts}/${maxReconnectAttempts}...`);
  
  // Configuration pour Aternos
  const options = {
    host: process.env.SERVER_HOST,
    port: parseInt(process.env.SERVER_PORT) || 25565,
    username: process.env.BOT_USERNAME || 'AFKBot',
    version: process.env.MC_VERSION || '1.21.1',
    hideErrors: true,
    checkTimeoutInterval: 30000,
    connectTimeout: 30000 // Timeout de connexion de 30s
  };
  
  // Si mot de passe Microsoft fourni
  if (process.env.BOT_PASSWORD && process.env.BOT_PASSWORD !== '') {
    options.auth = 'microsoft';
    options.password = process.env.BOT_PASSWORD;
  }
  
  console.log('🔗 Connexion en cours...');
  
  bot = mineflayer.createBot(options);
  
  // Gestion des événements
  bot.on('login', () => {
    console.log(`✅ Connecté en tant que ${bot.username}`);
    console.log('🎮 Bot prêt en mode AFK');
    reconnectAttempts = 0;
    isConnecting = false;
    
    // Une fois connecté, vérifier régulièrement si on est toujours connecté
    setInterval(() => {
      if (!bot || !bot.entity) {
        console.log('⚠️ Bot semble déconnecté, vérification...');
        checkConnection();
      }
    }, 10000);
  });
  
  bot.on('spawn', () => {
    console.log('📍 Position:', bot.entity.position);
    
    // Anti-AFK très discret pour Aternos
    setInterval(() => {
      if (bot && bot.entity) {
        // Tourne la tête très légèrement
        const newYaw = bot.entity.yaw + (Math.random() * 0.2 - 0.1);
        bot.look(newYaw, bot.entity.pitch, false);
      }
    }, 45000); // 45 secondes
    
    // Saut très rare
    setInterval(() => {
      if (bot && bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => {
          if (bot) bot.setControlState('jump', false);
        }, 100);
      }
    }, 300000); // 5 minutes
  });
  
  bot.on('kicked', (reason) => {
    console.log(`🚫 Kick: ${reason}`);
    handleDisconnection('kicked');
  });
  
  bot.on('error', (err) => {
    console.error(`❌ Erreur: ${err.message}`);
    handleDisconnection('error');
  });
  
  bot.on('end', (reason) => {
    console.log('🔌 Déconnexion:', reason || 'non spécifiée');
    handleDisconnection('end');
  });
}

// Gestion de la déconnexion
function handleDisconnection(type) {
  isConnecting = false;
  
  if (bot) {
    try {
      bot.end();
    } catch (e) {
      // Ignorer les erreurs de déconnexion
    }
    bot = null;
  }
  
  // Calcul du délai selon le type de déconnexion
  let delay = aternosWaitTime;
  
  if (type === 'kicked' && reconnectAttempts < maxReconnectAttempts) {
    // Pour Aternos, on attend plus longtemps après un kick
    delay = Math.min(aternosWaitTime * (reconnectAttempts + 1), 300000); // Max 5 minutes
  } else if (reconnectAttempts >= maxReconnectAttempts) {
    // Après trop de tentatives, on attend très longtemps
    console.log('⏸️ Trop de tentatives, pause de 10 minutes...');
    delay = 600000; // 10 minutes
    reconnectAttempts = 0;
  }
  
  console.log(`⏳ Prochaine tentative dans ${Math.round(delay/1000)} secondes...`);
  
  // Annuler le timer précédent si existe
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  // Programmer la reconnexion
  reconnectTimer = setTimeout(() => {
    console.log('🔄 Reprise de la connexion...');
    connectToServer();
  }, delay);
}

// Vérification de la connexion
function checkConnection() {
  if (!bot || !bot.entity) {
    console.log('🔍 Vérification: Bot déconnecté');
    handleDisconnection('check');
  }
}

// Démarrer la première connexion avec un délai initial
console.log('⏳ Démarrage dans 10 secondes...');
setTimeout(() => {
  connectToServer();
}, 10000);

// Nettoyage
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt propre du bot...');
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (bot) bot.end();
  process.exit(0);
});

// Gestion des erreurs non attrapées
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur critique:', error.message);
  handleDisconnection('uncaught');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promise rejetée:', reason);
});