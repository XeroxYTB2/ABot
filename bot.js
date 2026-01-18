const mineflayer = require('mineflayer');
const express = require('express');

// Configuration Railway
const WEB_PORT = process.env.PORT || 3000;
const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        bot: bot ? (isConnected ? 'connected' : 'disconnected') : 'not_created',
        timestamp: Date.now()
    });
});

app.get('/', (req, res) => {
    res.send('🤖 Minecraft Bot Forge 1.20.1 - Online');
});

const server = app.listen(WEB_PORT, () => {
    console.log(`✅ Serveur web démarré sur le port ${WEB_PORT}`);
    setTimeout(() => createBot(), 1000);
});

// Configuration
const config = {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'RailwayBot',
    version: process.env.MC_VERSION || '1.20.1',
    auth: process.env.MC_AUTH || 'offline'
};

// Whitelist
const WHITELIST = (process.env.WHITELIST || 'Xrox_').split(',').map(name => name.trim());

let bot = null;
let isConnected = false;
let antiAFKInterval = null;

// DÉMARRAGE
console.log('🤖 Bot Forge 1.20.1');

function createBot() {
    console.log(`🔌 Connexion à ${config.host}:${config.port}...`);
    
    // Configuration Forge - méthode standard
    const options = {
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version,
        auth: config.auth,
        connectTimeout: 30000,
        keepAlive: true
    };

    // Si on utilise Forge, on active le support Forge
    // Mineflayer détecte automatiquement Forge sur le serveur
    // Mais on peut forcer le client Forge avec cette option :
    options.forge = {
        enabled: true,
        // On peut aussi spécifier des mods côté client si nécessaire
        // Mais généralement, on n'a pas besoin de les spécifier
        // Le serveur enverra sa liste de mods et le client répondra qu'il les a
    };

    bot = mineflayer.createBot(options);

    // ÉVÉNEMENTS
    bot.on('login', () => {
        console.log('✅ Login réussi');
    });

    bot.on('spawn', () => {
        isConnected = true;
        console.log('📍 Bot spawné');
        bot.chat('✅ Bot Forge connecté !');
        
        // Démarrer l'anti-AFK après 10 secondes
        setTimeout(() => {
            startAntiAFK();
        }, 10000);
    });

    bot.on('forgeMods', (mods) => {
        console.log('📦 Mods du serveur détectés:');
        mods.forEach(mod => {
            console.log(`   - ${mod.modid} (${mod.version})`);
        });
    });

    bot.on('chat', (username, message) => {
        if (message.startsWith('!') && isWhitelisted(username)) {
            handleCommand(message, username);
        }
    });

    bot.on('kicked', (reason) => {
        console.log('👢 Kick:', JSON.stringify(reason));
        isConnected = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        
        // Reconnexion automatique
        setTimeout(() => {
            createBot();
        }, 5000);
    });

    bot.on('error', (err) => {
        console.error('❌ Erreur:', err.message);
        isConnected = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
    });

    bot.on('end', () => {
        console.log('🔌 Déconnecté');
        isConnected = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
    });
}

// ANTI-AFK
function startAntiAFK() {
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    
    antiAFKInterval = setInterval(() => {
        if (bot && isConnected) {
            const actions = ['forward', 'back', 'left', 'right'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(action, true);
            setTimeout(() => {
                if (bot) bot.setControlState(action, false);
            }, 1000);
            
            console.log(`🤖 Anti-AFK: ${action}`);
        }
    }, 45000);
}

// COMMANDES
const commands = {
    '!help': () => bot.chat('📋 Commandes: !help, !pos, !ping, !afk [on/off], !info'),
    '!pos': () => {
        const pos = bot.entity.position;
        bot.chat(`📍 X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`);
    },
    '!ping': () => bot.chat('🏓 Pong!'),
    '!afk': (args) => {
        if (args[0] === 'on') {
            startAntiAFK();
            bot.chat('✅ Anti-AFK activé');
        } else if (args[0] === 'off') {
            if (antiAFKInterval) {
                clearInterval(antiAFKInterval);
                antiAFKInterval = null;
            }
            bot.chat('⏸️ Anti-AFK désactivé');
        }
    },
    '!info': () => {
        const health = bot.health || 'N/A';
        const food = bot.food || 'N/A';
        bot.chat(`🤖 ${bot.username} | ❤️ ${health}/20 | 🍖 ${food}/20`);
    }
};

function isWhitelisted(playerName) {
    return WHITELIST.some(name => name.toLowerCase() === playerName.toLowerCase());
}

function handleCommand(message, username) {
    const args = message.trim().split(' ');
    const cmd = args[0].toLowerCase();
    
    if (commands[cmd]) {
        console.log(`✅ Commande de ${username}: ${message}`);
        commands[cmd](args.slice(1));
    }
}

// Gestion des arrêts
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt demandé');
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    if (bot) bot.quit('Arrêt');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt demandé');
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    if (bot) bot.quit('Arrêt');
    server.close(() => process.exit(0));
});
