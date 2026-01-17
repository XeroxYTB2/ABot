const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');
const express = require('express');

// Configuration via variables d'environnement Railway
const config = {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'RailwayBot',
    version: process.env.MC_VERSION || '1.20.1',
    auth: process.env.MC_AUTH || 'offline',
    
    // Configuration Forge (pour serveurs moddés)
    forgeOptions: {
        forgeMods: [
            {
                name: 'minecraft',
                version: '1.20.1'
            }
            // Ajoute d'autres mods ici si nécessaire
            // Ces mods doivent correspondre à ceux du serveur
        ]
    }
};

// Configuration Railway
const WEB_PORT = process.env.PORT || 3000;

// Serveur web minimal pour Railway health checks
const app = express();
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        bot: bot ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.send('🤖 Minecraft Forge Bot is running on Railway');
});

app.listen(WEB_PORT, () => {
    console.log(`🌐 Serveur web Railway actif sur le port ${WEB_PORT}`);
});

let bot;
let isConnected = false;

function createBot() {
    console.log('🚀 Tentative de connexion au serveur Minecraft...');
    console.log(`📡 Serveur: ${config.host}:${config.port}`);
    console.log(`👤 Bot: ${config.username}`);
    
    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version,
        auth: config.auth,
        
        // Configuration Forge
        forgeOptions: config.forgeOptions,
        
        // Options réseau pour Railway
        connectTimeout: 30 * 1000, // 30 secondes
        keepAlive: true,
        checkTimeoutInterval: 30 * 1000
    });

    // Charger les plugins
    bot.loadPlugin(pathfinder);

    // ======================
    // GESTION DES ÉVÉNEMENTS
    // ======================

    bot.on('login', () => {
        console.log('✅ Authentifié sur le serveur');
        console.log(`🎮 Version: ${bot.version}`);
    });

    bot.on('spawn', () => {
        isConnected = true;
        console.log('📍 Bot spawné dans le monde');
        console.log(`🌍 Dimension: ${bot.game.dimension}`);
        
        // Initialiser les mouvements
        const mcData = minecraftData(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);
        
        // Dire bonjour dans le chat
        setTimeout(() => {
            bot.chat('Bonjour ! Je suis un bot Railway 🤖');
        }, 3000);
    });

    bot.on('message', (jsonMsg) => {
        const message = jsonMsg.toString();
        console.log(`💬 ${message}`);
        
        // Commandes
        if (message.includes('!help')) {
            bot.chat('Commandes: !pos, !ping, !follow [joueur], !stop');
        }
        
        if (message.includes('!ping')) {
            bot.chat('🏓 Pong! (from Railway)');
        }
        
        if (message.includes('!pos')) {
            const pos = bot.entity.position;
            bot.chat(`📍 X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`);
        }
    });

    bot.on('whisper', (username, message) => {
        console.log(`📩 Message privé de ${username}: ${message}`);
    });

    bot.on('playerJoined', (player) => {
        console.log(`👋 ${player.username} a rejoint`);
    });

    bot.on('playerLeft', (player) => {
        console.log(`👋 ${player.username} a quitté`);
    });

    bot.on('kicked', (reason) => {
        console.log(`👢 Kick: ${reason}`);
        isConnected = false;
        handleDisconnection();
    });

    bot.on('error', (err) => {
        console.error(`❌ Erreur: ${err.message}`);
        isConnected = false;
        handleDisconnection();
    });

    bot.on('end', (reason) => {
        console.log(`🔌 Déconnecté: ${reason || 'No reason provided'}`);
        isConnected = false;
        handleDisconnection();
    });

    // ======================
    // SYSTÈME ANTI-AFK
    // ======================
    
    setInterval(() => {
        if (bot && isConnected) {
            // Mouvements aléatoires anti-AFK
            const actions = ['forward', 'back', 'left', 'right', 'jump'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(action, true);
            setTimeout(() => {
                if (bot) bot.setControlState(action, false);
            }, 500);
            
            console.log(`🤖 Anti-AFK: ${action}`);
        }
    }, 60000); // Toutes les minutes
}

// ======================
// GESTION RECONNEXION
// ======================

let reconnectAttempts = 0;
const MAX_RECONNECTS = 20;

function handleDisconnection() {
    reconnectAttempts++;
    
    if (reconnectAttempts > MAX_RECONNECTS) {
        console.log('❌ Nombre maximum de reconnexions atteint');
        console.log('🔄 Redémarrage complet dans 30 secondes...');
        setTimeout(() => {
            process.exit(1); // Railway redémarrera le conteneur
        }, 30000);
        return;
    }
    
    const delay = Math.min(reconnectAttempts * 5000, 30000); // Max 30 secondes
    
    console.log(`🔄 Reconnexion dans ${delay/1000}s (tentative ${reconnectAttempts}/${MAX_RECONNECTS})`);
    
    setTimeout(() => {
        if (bot) {
            try {
                bot.end();
            } catch (e) {}
        }
        createBot();
    }, delay);
}

// ======================
// DÉMARRAGE
// ======================

// Vérifier les variables d'environnement critiques
if (!process.env.MC_HOST) {
    console.warn('⚠️ Avertissement: MC_HOST non défini, utilisation de la valeur par défaut');
}

console.log('🤖 Démarrage du bot Minecraft Forge sur Railway');
console.log('📋 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Username: ${config.username}`);
console.log(`   Version: ${config.version}`);
console.log('========================================');

// Démarrer le bot
createBot();

// Gestion des arrêts propres
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, arrêt propre...');
    if (bot) bot.quit('Arrêt Railway');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu, arrêt propre...');
    if (bot) bot.quit('Arrêt manuel');
    process.exit(0);
});
