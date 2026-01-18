const mineflayer = require('mineflayer');
const http = require('http');

// Mini serveur HTTP pour Railway
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    bot: 'Minecraft AFK Bot',
    connected: bot ? 'connected' : 'disconnected'
  }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Serveur HTTP sur le port ${PORT}`);
});

// Configuration
const config = {
  host: process.env.SERVER_HOST || 'localhost',
  port: parseInt(process.env.SERVER_PORT) || 25565,
  username: process.env.BOT_USERNAME || 'AFKBot',
  password: process.env.BOT_PASSWORD || '',
  version: process.env.MC_VERSION || '1.21.1'
};

let bot = null;

// Fonction pour créer le bot
function createBot() {
  console.log('🔄 Connexion au serveur Minecraft...');
  
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version
    // Pas d'auth Microsoft pour simplifier
    // Si vous utilisez un compte premium, ajoutez: auth: 'microsoft'
  });

  // Événements
  bot.on('login', () => {
    console.log(`✅ Connecté en tant que ${bot.username}`);
    console.log(`📡 Serveur: ${config.host}:${config.port}`);
  });

  bot.on('spawn', () => {
    console.log('👤 Bot spawné dans le monde');
    
    // Anti-AFK simple
    setInterval(() => {
      if (bot.entity) {
        // Tourne la tête
        bot.look(bot.entity.yaw + 0.1, bot.entity.pitch, false);
        console.log('🔄 Mouvement anti-AFK');
      }
    }, 30000);
  });

  bot.on('death', () => {
    console.log('💀 Bot mort');
  });

  bot.on('kicked', (reason) => {
    console.log('🚫 Kick:', reason);
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.error('❌ Erreur:', err.message);
    setTimeout(createBot, 15000);
  });

  bot.on('end', () => {
    console.log('🔌 Déconnecté');
    setTimeout(createBot, 5000);
  });

  return bot;
}

// Démarrer
createBot();

// Nettoyage
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt...');
  if (bot) bot.end();
  server.close();
  process.exit();
});
