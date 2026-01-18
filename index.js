const mineflayer = require('mineflayer');

console.log('🚀 Démarrage du bot AFK Minecraft...');

let bot = null;
let reconnectAttempts = 0;
let reconnectDelay = 10000; // 10 secondes initialement
const maxReconnectDelay = 300000; // 5 minutes maximum

function connectBot() {
  console.log(`🔄 Tentative de connexion #${reconnectAttempts + 1}...`);
  
  bot = mineflayer.createBot({
    host: process.env.SERVER_HOST,
    port: parseInt(process.env.SERVER_PORT) || 25565,
    username: process.env.BOT_USERNAME || 'AFKBot',
    version: process.env.MC_VERSION || '1.21.1',
    checkTimeoutInterval: 60000, // Vérifie la connexion toutes les 60s
    hideErrors: true // Cache les erreurs mineures
  });

  bot.on('login', () => {
    console.log(`✅ Connecté: ${bot.username}`);
    console.log(`📡 Serveur: ${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`);
    reconnectAttempts = 0; // Réinitialise le compteur
    reconnectDelay = 10000; // Réinitialise le délai
  });

  bot.on('spawn', () => {
    console.log('👤 Spawn réussi - Bot en AFK');
    
    // Anti-AFK simple
    setInterval(() => {
      if (bot.entity) {
        // Tourne la tête légèrement
        bot.look(bot.entity.yaw + 0.5, bot.entity.pitch, false);
        console.log('🔄 Mouvement anti-AFK');
      }
    }, 30000); // Toutes les 30 secondes
    
    // Saut occasionnel
    setInterval(() => {
      if (bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
        console.log('🦘 Petit saut');
      }
    }, 120000); // Toutes les 2 minutes
  });

  bot.on('kicked', (reason) => {
    console.log(`🚫 Kick: ${reason}`);
    
    // Augmente le délai progressivement
    reconnectAttempts++;
    reconnectDelay = Math.min(reconnectDelay * 1.5, maxReconnectDelay);
    
    console.log(`⏳ Prochaine tentative dans ${Math.round(reconnectDelay/1000)} secondes...`);
    
    setTimeout(() => {
      if (bot) bot.end();
      connectBot();
    }, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.error(`❌ Erreur: ${err.message}`);
    
    // Délai plus long pour les erreurs
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
    
    console.log(`⏳ Reconnexion dans ${Math.round(reconnectDelay/1000)} secondes...`);
    
    setTimeout(() => {
      if (bot) bot.end();
      connectBot();
    }, reconnectDelay);
  });

  bot.on('end', () => {
    console.log('🔌 Déconnexion du serveur');
    
    // Délai normal pour les déconnexions normales
    reconnectDelay = Math.min(reconnectDelay * 1.2, 60000); // Max 1 minute
    
    console.log(`⏳ Reconnexion dans ${Math.round(reconnectDelay/1000)} secondes...`);
    
    setTimeout(() => {
      connectBot();
    }, reconnectDelay);
  });

  // Gestion de l'expiration de la session
  bot.on('sessionExpired', () => {
    console.log('🔑 Session expirée - Reconnexion...');
    setTimeout(() => {
      if (bot) bot.end();
      connectBot();
    }, 10000);
  });
}

// Démarrer la première connexion
connectBot();

// Garde le processus actif
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bot...');
  if (bot) bot.end();
  process.exit(0);
});

// Gestion des erreurs non catchées
process.on('uncaughtException', (err) => {
  console.error('💥 Erreur non gérée:', err.message);
  console.log('🔄 Redémarrage dans 30 secondes...');
  
  setTimeout(() => {
    if (bot) bot.end();
    connectBot();
  }, 30000);
});
