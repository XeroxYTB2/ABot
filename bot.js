const mineflayer = require('mineflayer');
const http = require('http');

// Configuration depuis les variables d'environnement Railway
const CONFIG = {
  host: process.env.SERVER_HOST || 'play.cubecraft.net',
  port: parseInt(process.env.SERVER_PORT) || 25565,
  username: process.env.BOT_USERNAME || 'RailwayAFK',
  version: process.env.MINECRAFT_VERSION || '1.20.1',
  auth: process.env.AUTH_TYPE || 'offline'
};

console.log('🚀 Démarrage Bot Railway AFK');
console.log('Configuration:', CONFIG);

// Créer le bot
const bot = mineflayer.createBot({
  host: CONFIG.host,
  port: CONFIG.port,
  username: CONFIG.username,
  version: CONFIG.version,
  auth: CONFIG.auth,
  hideErrors: false
});

// Événements
bot.on('login', () => {
  console.log(`✅ Connecté en tant que ${bot.username} sur ${CONFIG.host}:${CONFIG.port}`);
  
  // Message de bienvenue
  setTimeout(() => {
    bot.chat('Bot AFK Railway actif !');
  }, 3000);
});

bot.on('spawn', () => {
  console.log('🌍 Spawn dans le monde');
  
  // Démarrer mouvements AFK
  setInterval(() => {
    if (bot.entity) {
      // Tourner légèrement
      bot.look(bot.entity.yaw + 0.1, bot.entity.pitch);
      
      // Sauter occasionnellement
      if (Math.random() > 0.7) {
        bot.setControlState('jump', true);
        setTimeout(() => {
          bot.setControlState('jump', false);
        }, 100);
      }
    }
  }, 15000);
});

bot.on('kicked', (reason) => {
  console.log(`🚫 Expulsé: ${reason}`);
  
  // Si c'est une erreur Forge, essayer avec forge:true
  if (reason.includes('Forge') || reason.includes('forge')) {
    console.log('⚠️  Tentative avec support Forge...');
    // Vous pourriez relancer avec forge:true ici
  }
});

bot.on('error', (err) => {
  console.error('❌ Erreur:', err.message);
});

bot.on('end', () => {
  console.log('🔌 Déconnecté');
  console.log('🔄 Reconnexion dans 30s...');
  setTimeout(() => {
    process.exit(1); // Railway va redémarrer le container
  }, 30000);
});

// Health check pour Railway
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      bot: bot ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`🌐 Health check sur le port ${process.env.PORT || 8080}`);
});
