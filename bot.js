// ═══════════════════════════════════════════════════════════
// BOT MINECRAFT AVEC TENTATIVE FORGE - RAILWAY
// ═══════════════════════════════════════════════════════════

const mineflayer = require('mineflayer');
const express = require('express');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const BOT_CONFIG = {
  host: process.env.MC_HOST || 'Xerox200IQYTB-6VGP.aternos.me',
  port: parseInt(process.env.MC_PORT) || 32799,
  username: process.env.MC_USERNAME || 'BotAFK',
  version: process.env.MC_VERSION || '1.20.1',
  auth: process.env.MC_AUTH || 'offline',
  // Essayer de se connecter en mode "client vanilla" même sur Forge
  hideErrors: false
};

// ═══════════════════════════════════════════════════════════
// KEEP-ALIVE HTTP (RAILWAY)
// ═══════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;

let botStatus = {
  connected: false,
  username: BOT_CONFIG.username,
  lastError: null,
  reconnectAttempts: 0,
  connectedAt: null
};

app.get('/', (req, res) => {
  res.json({
    status: botStatus.connected ? 'online' : 'offline',
    bot: BOT_CONFIG.username,
    server: `${BOT_CONFIG.host}:${BOT_CONFIG.port}`,
    version: BOT_CONFIG.version,
    lastError: botStatus.lastError,
    reconnectAttempts: botStatus.reconnectAttempts,
    uptime: botStatus.connectedAt ? Math.floor((Date.now() - botStatus.connectedAt) / 1000) : 0
  });
});

app.get('/status', (req, res) => {
  res.json(botStatus);
});

app.listen(PORT, () => {
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  console.log('');
});

// ═══════════════════════════════════════════════════════════
// FONCTION DE CRÉATION DU BOT
// ═══════════════════════════════════════════════════════════

let bot = null;

function createBot() {
  console.log('═'.repeat(60));
  console.log('🤖 MINECRAFT BOT - TENTATIVE CONNEXION FORGE');
  console.log('═'.repeat(60));
  console.log(`📍 Serveur: ${BOT_CONFIG.host}:${BOT_CONFIG.port}`);
  console.log(`👤 Pseudo: ${BOT_CONFIG.username}`);
  console.log(`🎮 Version: ${BOT_CONFIG.version}`);
  console.log(`🔐 Auth: ${BOT_CONFIG.auth}`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('⚠️  NOTE: Ce bot va tenter de se connecter.');
  console.log('   Si le serveur Forge nécessite des mods, il sera kick.');
  console.log('');

  try {
    bot = mineflayer.createBot(BOT_CONFIG);

    // ═══════════════════════════════════════════════════════════
    // ÉVÉNEMENTS DE CONNEXION
    // ═══════════════════════════════════════════════════════════

    bot.on('login', () => {
      console.log('');
      console.log('✅ CONNECTÉ AU SERVEUR !');
      console.log(`👤 ${bot.username}`);
      if (bot.player?.uuid) {
        console.log(`🆔 UUID: ${bot.player.uuid}`);
      }
      console.log('');
      
      botStatus.connected = true;
      botStatus.connectedAt = Date.now();
      botStatus.lastError = null;
    });

    bot.on('spawn', () => {
      console.log('🌍 SPAWN DANS LE MONDE');
      console.log(`📍 Position: x=${Math.floor(bot.entity.position.x)}, y=${Math.floor(bot.entity.position.y)}, z=${Math.floor(bot.entity.position.z)}`);
      console.log(`💚 Vie: ${bot.health}/20`);
      console.log(`🍖 Nourriture: ${bot.food}/20`);
      console.log('');
      
      // Message après spawn
      setTimeout(() => {
        try {
          bot.chat('Bot connecté ! (Mode Forge test)');
        } catch (err) {
          console.log('⚠️  Impossible d\'envoyer de message');
        }
      }, 2000);
    });

    bot.on('health', () => {
      console.log(`💚 Vie: ${bot.health}/20 | 🍖 Nourriture: ${bot.food}/20`);
    });

    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      console.log(`💬 [${username}] ${message}`);
      
      // Répondre à certains messages
      if (message.toLowerCase().includes('bot')) {
        setTimeout(() => {
          bot.chat(`Oui ${username} ?`);
        }, 1000);
      }
    });

    bot.on('whisper', (username, message) => {
      console.log(`📨 [Whisper] ${username}: ${message}`);
    });

    // ═══════════════════════════════════════════════════════════
    // GESTION DES ERREURS
    // ═══════════════════════════════════════════════════════════

    bot.on('error', (err) => {
      console.error('');
      console.error('❌ ERREUR:', err.message);
      console.error('');
      
      botStatus.lastError = err.message;
      
      // Analyser l'erreur
      if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
        console.log('⚠️  Le serveur est inaccessible ou éteint');
      } else if (err.message.includes('Invalid username')) {
        console.log('⚠️  Pseudo invalide ou déjà utilisé');
      } else if (err.message.includes('unverified_username')) {
        console.log('⚠️  Le serveur nécessite un compte Microsoft');
        console.log('   → Changez MC_AUTH en mode online et ajoutez email/password');
      }
    });

    bot.on('kicked', (reason) => {
      console.log('');
      console.log('👢 KICK DU SERVEUR');
      
      let reasonText = reason;
      try {
        // Essayer de parser le JSON si c'est un objet
        if (typeof reason === 'object') {
          reasonText = JSON.stringify(reason);
        }
      } catch (e) {
        // Ignorer
      }
      
      console.log(`Raison: ${reasonText}`);
      console.log('');
      
      botStatus.connected = false;
      botStatus.lastError = `Kick: ${reasonText}`;
      
      // Analyser le kick
      const reasonLower = reasonText.toLowerCase();
      
      if (reasonLower.includes('mod') || reasonLower.includes('forge')) {
        console.log('═'.repeat(60));
        console.log('⚠️  KICK LIÉ AUX MODS FORGE DÉTECTÉ');
        console.log('═'.repeat(60));
        console.log('');
        console.log('Le serveur a détecté que le bot n\'a pas les mods requis.');
        console.log('');
        console.log('💡 SOLUTIONS POSSIBLES:');
        console.log('');
        console.log('1️⃣  FAKE PLAYER (MEILLEURE SOLUTION):');
        console.log('   → Installer le mod Carpet sur votre serveur Forge');
        console.log('   → Commande: /player ' + BOT_CONFIG.username + ' spawn');
        console.log('   → Le bot sera un vrai joueur compatible avec tous les mods');
        console.log('');
        console.log('2️⃣  DÉSACTIVER LA VÉRIFICATION DES MODS:');
        console.log('   → Dans server.properties ou config Forge');
        console.log('   → Permettre les clients vanilla');
        console.log('');
        console.log('3️⃣  PASSER LE SERVEUR EN VANILLA:');
        console.log('   → Retirer Forge temporairement');
        console.log('');
        console.log('═'.repeat(60));
      } else if (reasonLower.includes('whitelist')) {
        console.log('⚠️  Le serveur a une whitelist');
        console.log('   → Ajoutez le bot à la whitelist');
      } else if (reasonLower.includes('full')) {
        console.log('⚠️  Le serveur est plein');
      }
      
      botStatus.reconnectAttempts++;
      console.log(`🔄 Reconnexion dans 15 secondes... (Tentative #${botStatus.reconnectAttempts})`);
      console.log('');
      
      setTimeout(createBot, 15000);
    });

    bot.on('end', (reason) => {
      console.log('');
      console.log('🔌 DÉCONNEXION');
      console.log(`Raison: ${reason || 'Inconnue'}`);
      console.log('');
      
      botStatus.connected = false;
      botStatus.reconnectAttempts++;
      
      console.log(`🔄 Reconnexion dans 15 secondes... (Tentative #${botStatus.reconnectAttempts})`);
      console.log('');
      
      setTimeout(createBot, 15000);
    });

    // ═══════════════════════════════════════════════════════════
    // COMMANDES DE DEBUG
    // ═══════════════════════════════════════════════════════════

    bot.on('message', (message) => {
      // Logger tous les messages système
      const text = message.toString();
      if (!text.startsWith('<')) {
        console.log(`📢 ${text}`);
      }
    });

  } catch (err) {
    console.error('');
    console.error('💥 ERREUR CRITIQUE:', err);
    console.error('');
    botStatus.lastError = err.message;
    botStatus.reconnectAttempts++;
    
    console.log('🔄 Redémarrage dans 15 secondes...');
    setTimeout(createBot, 15000);
  }
}

// ═══════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('🚀 Démarrage du bot...');
console.log('');

createBot();

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Arrêt du bot...');
  if (bot) {
    bot.quit('Bot arrêté');
  }
  process.exit(0);
});
