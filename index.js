const mineflayer = require('mineflayer');

// Démarrer d'abord le serveur HTTP de healthcheck
require('./healthcheck');

// Configuration depuis les variables d'environnement avec validation
const config = {
  host: process.env.SERVER_HOST,
  port: parseInt(process.env.SERVER_PORT) || 25565,
  username: process.env.BOT_USERNAME || 'AFKBot',
  password: process.env.BOT_PASSWORD || '',
  version: process.env.MC_VERSION || '1.21.1'
};

// Vérification critique
if (!config.host) {
  console.error('❌ ERREUR CRITIQUE: SERVER_HOST non défini!');
  console.error('🔧 Définissez SERVER_HOST dans les variables Railway');
  console.error('💡 Exemple: mc.monserveur.com ou 123.456.789.123');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  Bot:', config.username);
console.log('  Version:', config.version);
console.log('🌐 Healthcheck sur port', process.env.PORT || 8080);

let botInstance = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Fonction pour créer le bot
function createBot() {
  console.log(`🔗 Connexion à ${config.host}:${config.port}...`);
  
  try {
    const bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      version: config.version,
      auth: config.password ? 'microsoft' : 'offline',
      // Options supplémentaires pour éviter les problèmes
      connectTimeout: 30000, // 30 secondes timeout
      keepAlive: true
    });

    botInstance = bot;
    reconnectAttempts = 0;

    // Événements
    bot.on('login', () => {
      console.log(`✅ Connecté en tant que ${bot.username}`);
      console.log('🎮 Joueurs en ligne:', Object.keys(bot.players).length);
    });

    bot.on('spawn', () => {
      console.log('👤 Bot spawné dans le monde');
      console.log(`📍 Position: ${bot.entity.position}`);
      
      // Anti-AFK : mouvement aléatoire toutes les 30 secondes
      setInterval(() => {
        if (bot.entity) {
          // Tourne légèrement pour éviter le kick
          bot.look(bot.entity.yaw + 0.5, bot.entity.pitch, true);
          console.log('🔄 Mouvement anti-AFK');
        }
      }, 30000);

      // Saut toutes les 2 minutes
      setInterval(() => {
        if (bot.entity) {
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 500);
          console.log('🦘 Saut effectué');
        }
      }, 120000);
    });

    bot.on('death', () => {
      console.log('💀 Bot mort - Tentative de respawn...');
      setTimeout(() => {
        if (bot) bot.chat('/spawn');
      }, 3000);
    });

    bot.on('kicked', (reason) => {
      console.log('🚫 Kick du serveur:', reason.toString());
      reconnect();
    });

    bot.on('error', (err) => {
      console.error('❌ Erreur:', err.message);
      if (err.code === 'ECONNREFUSED') {
        console.error('🔌 Impossible de se connecter au serveur Minecraft');
        console.error('💡 Vérifiez que:');
        console.error('   1. Le serveur est en ligne');
        console.error('   2. SERVER_HOST est correct');
        console.error('   3. Le port est ouvert (25565)');
      }
      reconnect();
    });

    bot.on('end', () => {
      console.log('🔌 Déconnecté du serveur');
      reconnect();
    });

    // Commande simple via chat
    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      
      if (message === '!pos') {
        const pos = bot.entity.position;
        bot.chat(`📍 Ma position: ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`);
      }
      
      if (message === '!help') {
        bot.chat('🤖 Commandes: !pos - !ping');
      }
      
      if (message === '!ping') {
        bot.chat('🏓 Pong!');
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création du bot:', error.message);
    reconnect();
  }
}

function reconnect() {
  reconnectAttempts++;
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`❌ Trop de tentatives de reconnexion (${MAX_RECONNECT_ATTEMPTS})`);
    console.error('💤 Arrêt des tentatives...');
    return;
  }
  
  const delay = Math.min(30000, 5000 * reconnectAttempts); // Augmente progressivement
  console.log(`🔄 Reconnexion dans ${delay/1000} secondes... (tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  // Nettoyer l'ancien bot
  if (botInstance) {
    try {
      botInstance.end();
      botInstance = null;
    } catch (e) {}
  }
  
  setTimeout(createBot, delay);
}

// Démarrer le bot après 3 secondes
setTimeout(() => {
  createBot();
}, 3000);

// Garder le processus actif
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bot...');
  if (botInstance) botInstance.end();
  process.exit();
});

// Gestion des promesses non gérées
process.on('unhandledRejection', (error) => {
  console.error('⚠️ Promesse non gérée:', error.message);
});
