const mineflayer = require('mineflayer');
const http = require('http');

console.log('========================================');
console.log('🤖 Minecraft Forge AFK Bot - Railway');
console.log('========================================');

// ===== CONFIGURATION =====
const CONFIG = {
  // Variables Railway (OBLIGATOIRES)
  host: process.env.SERVER_HOST || 'play.cubecraft.net',
  port: parseInt(process.env.SERVER_PORT) || 25565,
  username: process.env.BOT_USERNAME || 'RailwayBot_' + Math.random().toString(36).substr(2, 5),
  version: process.env.MINECRAFT_VERSION || '1.20.1',
  auth: process.env.AUTH_TYPE || 'offline',
  
  // Options Forge
  forgeEnabled: process.env.FORGE_ENABLED === 'true',
  
  // Compteur de tentatives
  reconnectAttempts: 0,
  maxReconnectAttempts: 10
};

// Afficher la configuration
console.log('⚙️ Configuration:');
console.log(`   Serveur: ${CONFIG.host}:${CONFIG.port}`);
console.log(`   Bot: ${CONFIG.username}`);
console.log(`   Version: ${CONFIG.version}`);
console.log(`   Auth: ${CONFIG.auth}`);
console.log(`   Forge: ${CONFIG.forgeEnabled ? '✅ Activé' : '❌ Désactivé'}`);
console.log('========================================\n');

// ===== CRÉATION DU BOT =====
function createBot() {
  console.log(`🔄 Tentative de connexion #${CONFIG.reconnectAttempts + 1}...`);
  
  const options = {
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    auth: CONFIG.auth,
    hideErrors: false,
    
    // Options importantes pour la stabilité
    viewDistance: 'tiny',
    chatLengthLimit: 256,
    colorsEnabled: false
  };
  
  // Option Forge si activé
  if (CONFIG.forgeEnabled) {
    options.forge = true;
    options.skipValidation = true; // CRITIQUE pour Forge
    console.log('🔧 Mode Forge activé');
  }
  
  const bot = mineflayer.createBot(options);
  
  // ===== ÉVÉNEMENTS DU BOT =====
  
  bot.on('login', () => {
    console.log('✅ CONNECTÉ AU SERVEUR!');
    console.log(`   👤 Nom: ${bot.username}`);
    console.log(`   🆔 UUID: ${bot.player.uuid}`);
    CONFIG.reconnectAttempts = 0; // Réinitialiser le compteur
  });
  
  bot.on('spawn', () => {
    console.log('🌍 SPAWN DANS LE MONDE');
    
    // Actions après spawn
    setTimeout(() => {
      console.log('💬 Envoi des messages...');
      bot.chat('Bonjour! Bot Railway AFK actif.');
      
      if (CONFIG.forgeEnabled) {
        bot.chat('Client Forge 1.20.1 détecté.');
      }
      
      // Commande AFK si supportée
      setTimeout(() => {
        bot.chat('/afk on');
      }, 2000);
    }, 3000);
    
    // Démarrer les mouvements AFK
    startAFKSystem(bot);
  });
  
  // Événement spécifique à Forge
  if (CONFIG.forgeEnabled) {
    bot.on('forgeHandshake', (data) => {
      console.log('🤝 HANDSHAKE FORGE RÉUSSI!');
      if (data.modList && data.modList.length > 0) {
        console.log(`📦 ${data.modList.length} mod(s) détecté(s):`);
        data.modList.slice(0, 5).forEach(mod => {
          console.log(`   - ${mod.modid} v${mod.version}`);
        });
      }
    });
    
    bot.on('pluginMessage', (channel, data) => {
      if (channel.includes('forge') || channel.includes('fml')) {
        console.log(`🔌 Message plugin: ${channel}`);
      }
    });
  }
  
  bot.on('message', (jsonMsg) => {
    const message = jsonMsg.toString().trim();
    
    // Filtrer les messages de log spammy
    if (message.length > 0 && !message.includes('<') && !message.includes('>')) {
      console.log(`💬 ${message}`);
    }
    
    // Répondre aux mentions
    if (message.toLowerCase().includes(CONFIG.username.toLowerCase())) {
      setTimeout(() => {
        bot.chat('Je suis un bot AFK Railway!');
      }, 1000);
    }
  });
  
  bot.on('kicked', (reason) => {
    const reasonStr = JSON.stringify(reason);
    console.log(`🚫 EXPULSÉ: ${reasonStr}`);
    
    // Détection d'erreur Forge
    if (reasonStr.includes('Forge') || reasonStr.includes('forge') || reasonStr.includes('mod')) {
      console.log('⚠️  ERREUR FORGE DÉTECTÉE!');
      console.log('💡 Essayez d\'activer FORGE_ENABLED=true dans Railway');
    }
    
    handleDisconnection(bot);
  });
  
  bot.on('error', (err) => {
    console.error(`❌ ERREUR: ${err.message}`);
    if (err.stack) console.error(err.stack);
    handleDisconnection(bot);
  });
  
  bot.on('end', (reason) => {
    console.log(`🔌 DÉCONNECTÉ: ${reason || 'Raison inconnue'}`);
    handleDisconnection(bot);
  });
  
  return bot;
}

// ===== SYSTÈME AFK =====
function startAFKSystem(bot) {
  console.log('⏱️  SYSTÈME AFK ACTIVÉ');
  
  // Intervalle de mouvement principal
  bot.afkInterval = setInterval(() => {
    if (!bot.entity) return;
    
    try {
      // 1. Tourner la tête
      const newYaw = (bot.entity.yaw + 0.5) % (Math.PI * 2);
      bot.look(newYaw, bot.entity.pitch, false);
      
      // 2. Sauter aléatoirement
      if (Math.random() < 0.3) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 150);
      }
      
      // 3. Marcher occasionnellement
      if (Math.random() < 0.15) {
        bot.setControlState('forward', true);
        setTimeout(() => bot.setControlState('forward', false), 300);
      }
      
      // 4. Changer de regard (haut/bas)
      if (Math.random() < 0.2) {
        const newPitch = Math.sin(Date.now() / 10000) * 0.5;
        bot.look(bot.entity.yaw, newPitch, false);
      }
      
      console.log('🔄 Mouvement AFK exécuté');
    } catch (err) {
      console.log('⚠️  Erreur mouvement AFK:', err.message);
    }
  }, 15000); // Toutes les 15 secondes
  
  // Intervalle secondaire pour varier
  bot.afkInterval2 = setInterval(() => {
    if (!bot.entity) return;
    
    // Action spéciale occasionnelle
    if (Math.random() < 0.1) {
      bot.swingArm();
      console.log('👋 Coup de main exécuté');
    }
  }, 45000); // Toutes les 45 secondes
}

// ===== GESTION DÉCONNEXION =====
function handleDisconnection(bot) {
  // Nettoyer les intervalles
  if (bot.afkInterval) clearInterval(bot.afkInterval);
  if (bot.afkInterval2) clearInterval(bot.afkInterval2);
  
  // Incrémenter le compteur
  CONFIG.reconnectAttempts++;
  
  if (CONFIG.reconnectAttempts >= CONFIG.maxReconnectAttempts) {
    console.log(`💀 MAXIMUM DE TENTATIVES ATTEINT (${CONFIG.maxReconnectAttempts})`);
    console.log('🛑 Arrêt du bot...');
    process.exit(1); // Railway redémarrera le container
  }
  
  // Calcul du délai exponentiel
  const delay = Math.min(CONFIG.reconnectAttempts * 10000, 60000);
  console.log(`🔄 Reconnexion dans ${delay/1000}s... (${CONFIG.reconnectAttempts}/${CONFIG.maxReconnectAttempts})`);
  
  setTimeout(() => {
    console.log('🔄 Nouvelle tentative...\n');
    global.bot = createBot();
  }, delay);
}

// ===== HEALTH CHECK SERVER (Railway) =====
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    const healthData = {
      status: 'healthy',
      service: 'minecraft-forge-bot',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      reconnects: CONFIG.reconnectAttempts,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
    
    res.end(JSON.stringify(healthData, null, 2));
    
  } else if (req.url === '/') {
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    });
    
    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Minecraft Forge AFK Bot</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          margin-top: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
        }
        .status {
          display: inline-block;
          padding: 5px 15px;
          background: #10b981;
          border-radius: 20px;
          font-weight: bold;
          margin: 20px 0;
        }
        .info {
          background: rgba(255, 255, 255, 0.2);
          padding: 15px;
          border-radius: 10px;
          margin: 15px 0;
        }
        a {
          color: #93c5fd;
          text-decoration: none;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
        .button {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          text-decoration: none;
          margin: 10px 5px;
          transition: background 0.3s;
        }
        .button:hover {
          background: #2563eb;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Minecraft Forge AFK Bot</h1>
        <div class="status">✅ Service Actif</div>
        
        <div class="info">
          <strong>Serveur:</strong> ${CONFIG.host}:${CONFIG.port}<br>
          <strong>Bot:</strong> ${CONFIG.username}<br>
          <strong>Version:</strong> ${CONFIG.version}<br>
          <strong>Forge:</strong> ${CONFIG.forgeEnabled ? 'Activé' : 'Désactivé'}<br>
          <strong>Tentatives reconnexion:</strong> ${CONFIG.reconnectAttempts}
        </div>
        
        <p>Ce bot est hébergé sur Railway et maintiendra votre serveur Minecraft actif 24/7.</p>
        
        <div>
          <a href="/health" class="button">Health Check</a>
          <a href="https://railway.app" class="button" target="_blank">Railway</a>
          <a href="https://github.com" class="button" target="_blank">GitHub</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
          📍 Hébergé sur Railway | 🔄 Redémarrage automatique | 🛡️ Health Checks
        </p>
      </div>
    </body>
    </html>
    `;
    
    res.end(html);
    
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - Page non trouvée');
  }
});

// Démarrer le serveur health check
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Health check server: http://0.0.0.0:${PORT}`);
  console.log(`🔗 Accès web: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
});

// ===== DÉMARRAGE DU BOT =====
console.log('🚀 Initialisation du bot...\n');
global.bot = createBot();

// ===== GESTION DES SIGNALS =====
process.on('SIGINT', () => {
  console.log('\n🔴 Signal SIGINT (Ctrl+C) reçu...');
  shutdown();
});

process.on('SIGTERM', () => {
  console.log('\n🔴 Signal SIGTERM (Railway) reçu...');
  shutdown();
});

function shutdown() {
  console.log('🧹 Nettoyage avant arrêt...');
  
  if (global.bot) {
    if (global.bot.afkInterval) clearInterval(global.bot.afkInterval);
    if (global.bot.afkInterval2) clearInterval(global.bot.afkInterval2);
    
    try {
      global.bot.quit();
      console.log('👋 Bot déconnecté proprement');
    } catch (err) {
      // Ignorer les erreurs de déconnexion
    }
  }
  
  console.log('👋 Arrêt du service');
  process.exit(0);
}
