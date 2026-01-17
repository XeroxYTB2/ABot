// ═══════════════════════════════════════════════════════════
// BOT MINECRAFT FORGE - RAILWAY SETUP
// ═══════════════════════════════════════════════════════════

const mineflayer = require('mineflayer');
const forgeSupport = require('prismarine-forge');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const BOT_CONFIG = {
  host: process.env.MC_HOST || 'Xerox200IQYTB-6VGP.aternos.me',
  port: parseInt(process.env.MC_PORT) || 32799,
  username: process.env.MC_USERNAME || 'BotAFK',
  version: process.env.MC_VERSION || '1.20.1',
  auth: process.env.MC_AUTH || 'offline'
};

// ═══════════════════════════════════════════════════════════
// FONCTION DE CRÉATION DU BOT
// ═══════════════════════════════════════════════════════════

function createBot() {
  console.log('═'.repeat(60));
  console.log('🤖 MINECRAFT FORGE BOT');
  console.log('═'.repeat(60));
  console.log(`📍 Serveur: ${BOT_CONFIG.host}:${BOT_CONFIG.port}`);
  console.log(`👤 Pseudo: ${BOT_CONFIG.username}`);
  console.log(`🎮 Version: ${BOT_CONFIG.version}`);
  console.log(`🔐 Auth: ${BOT_CONFIG.auth}`);
  console.log('═'.repeat(60));
  console.log('');

  const bot = mineflayer.createBot(BOT_CONFIG);

  // ═══════════════════════════════════════════════════════════
  // SUPPORT FORGE
  // ═══════════════════════════════════════════════════════════
  
  try {
    // Activer le support Forge
    forgeSupport(bot);
    console.log('✅ Support Forge activé');
    
    // Écouter les mods détectés
    bot.on('forge:mods', (mods) => {
      console.log('📦 Mods Forge détectés:');
      mods.forEach((mod, index) => {
        console.log(`   ${index + 1}. ${mod.modId} v${mod.version || 'unknown'}`);
      });
    });
  } catch (err) {
    console.log('⚠️  Support Forge non disponible, mode vanilla');
  }

  // ═══════════════════════════════════════════════════════════
  // ÉVÉNEMENTS DE CONNEXION
  // ═══════════════════════════════════════════════════════════

  bot.on('login', () => {
    console.log('');
    console.log('✅ CONNECTÉ AU SERVEUR');
    console.log(`👤 ${bot.username} (UUID: ${bot.player?.uuid || 'N/A'})`);
    console.log('');
  });

  bot.on('spawn', () => {
    console.log('🌍 Spawn dans le monde');
    console.log(`📍 Position: ${bot.entity.position}`);
    console.log(`💚 HP: ${bot.health}/20`);
    console.log(`🍖 Food: ${bot.food}/20`);
    console.log('');
    
    // Message de bienvenue
    setTimeout(() => {
      bot.chat('Bot Forge connecté !');
    }, 2000);
  });

  bot.on('health', () => {
    console.log(`💚 HP: ${bot.health}/20 | 🍖 Food: ${bot.food}/20`);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`💬 [${username}] ${message}`);
  });

  // ═══════════════════════════════════════════════════════════
  // GESTION DES ERREURS
  // ═══════════════════════════════════════════════════════════

  bot.on('error', (err) => {
    console.error('❌ Erreur:', err.message);
    
    // Si erreur de mods
    if (err.message.includes('mod') || err.message.includes('Forge')) {
      console.log('');
      console.log('⚠️  ERREUR MODS DÉTECTÉE');
      console.log('Le serveur nécessite des mods côté client.');
      console.log('Prismarine-forge ne peut simuler que la connexion,');
      console.log('pas charger les vrais mods.');
      console.log('');
    }
  });

  bot.on('kicked', (reason) => {
    console.log('');
    console.log('👢 KICK DU SERVEUR');
    console.log(`Raison: ${reason}`);
    console.log('');
    
    // Analyser le kick
    if (reason.includes('mod') || reason.includes('Forge')) {
      console.log('⚠️  Kick lié aux mods Forge');
      console.log('Le serveur a détecté que le bot n\'a pas les bons mods.');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Utiliser un Fake Player (mod Carpet sur le serveur)');
      console.log('   2. Mettre le serveur en mode vanilla');
      console.log('   3. Désactiver la vérification des mods côté serveur');
      console.log('');
    }
    
    console.log('🔄 Reconnexion dans 15 secondes...');
    setTimeout(createBot, 15000);
  });

  bot.on('end', (reason) => {
    console.log('');
    console.log('🔌 Déconnexion');
    console.log(`Raison: ${reason || 'Inconnue'}`);
    console.log('🔄 Reconnexion dans 15 secondes...');
    console.log('');
    setTimeout(createBot, 15000);
  });

  // ═══════════════════════════════════════════════════════════
  // KEEP-ALIVE POUR RAILWAY
  // ═══════════════════════════════════════════════════════════

  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      bot: bot.username || 'Déconnecté',
      version: BOT_CONFIG.version,
      forge: 'Activé (prismarine-forge)'
    });
  });

  app.get('/status', (req, res) => {
    res.json({
      connected: bot.player !== null,
      username: bot.username,
      health: bot.health,
      food: bot.food,
      position: bot.entity?.position
    });
  });

  app.listen(PORT, () => {
    console.log(`🌐 Serveur HTTP: http://localhost:${PORT}`);
  });

  return bot;
}

// ═══════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════

createBot();
