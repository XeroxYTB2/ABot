const mineflayer = require('mineflayer');

// Démarrer d'abord le serveur HTTP de healthcheck
require('./healthcheck');

// Configuration depuis les variables d'environnement
const config = {
  host: process.env.SERVER_HOST || 'localhost',
  port: parseInt(process.env.SERVER_PORT) || 25565,
  username: process.env.BOT_USERNAME || 'AFKBot',
  password: process.env.BOT_PASSWORD || '',
  version: process.env.MC_VERSION || '1.21.1'
};

console.log('🔧 Configuration:', config);
console.log('🌐 Healthcheck démarré sur port', process.env.PORT || 8080);

// Fonction pour créer le bot
function createBot() {
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    version: config.version,
    auth: config.password ? 'microsoft' : 'offline'
  });

  // Événements
  bot.on('login', () => {
    console.log(`✅ Connecté en tant que ${bot.username}`);
    console.log(`📍 Position: ${bot.entity.position}`);
  });

  bot.on('spawn', () => {
    console.log('👤 Bot spawné dans le monde');
    
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
    console.log('💀 Bot mort - Reconnexion...');
    setTimeout(() => {
      bot.chat('/spawn');
    }, 3000);
  });

  bot.on('kicked', (reason) => {
    console.log('🚫 Kick du serveur:', reason);
    console.log('🔄 Reconnexion dans 10 secondes...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.error('❌ Erreur:', err.message);
    console.log('🔄 Reconnexion dans 15 secondes...');
    setTimeout(createBot, 15000);
  });

  bot.on('end', () => {
    console.log('🔌 Déconnecté du serveur');
    console.log('🔄 Reconnexion dans 5 secondes...');
    setTimeout(createBot, 5000);
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

  return bot;
}

// Démarrer le bot après 2 secondes (laisser le temps au healthcheck de démarrer)
setTimeout(() => {
  createBot();
}, 2000);

// Garder le processus actif
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bot...');
  process.exit();
});
