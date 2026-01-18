const mineflayer = require('mineflayer');
const express = require('express');

// ======================
// 1. DÉMARRER EXPRESS EN PREMIER
// ======================

// Configuration Railway
const WEB_PORT = process.env.PORT || 3000;

// Créer et démarrer Express IMMÉDIATEMENT
const app = express();

// Health check simple et rapide
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        bot: bot ? (isConnected ? 'connected' : 'disconnected') : 'not_created',
        timestamp: Date.now()
    });
});

app.get('/', (req, res) => {
    res.send('🤖 Minecraft Bot - Online');
});

// Démarrer le serveur web IMMÉDIATEMENT
const server = app.listen(WEB_PORT, () => {
    console.log(`✅ Serveur web démarré sur le port ${WEB_PORT}`);
    console.log(`✅ Health check: http://localhost:${WEB_PORT}/health`);
    
    // Maintenant qu'Express tourne, on démarre le bot
    setTimeout(() => {
        createBot();
    }, 1000);
});

// Configuration de base
const config = {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'RailwayBot',
    version: process.env.MC_VERSION || '1.20.1',
    auth: process.env.MC_AUTH || 'offline'
};

// Whitelist par défaut avec Xrox_
const WHITELIST = (process.env.WHITELIST || 'Xrox_').split(',').map(name => name.trim());

let bot = null;
let isConnected = false;
let antiAFKInterval = null;
let lastActivity = Date.now();

// ======================
// UTILITAIRES
// ======================

function isWhitelisted(playerName) {
    return WHITELIST.some(name => name.toLowerCase() === playerName.toLowerCase());
}

function safeBotAction(action, errorMsg) {
    try {
        if (bot && isConnected) {
            action();
            lastActivity = Date.now();
            return true;
        }
        return false;
    } catch (err) {
        console.log(`⚠️ ${errorMsg}:`, err.message);
        return false;
    }
}

// ======================
// ANTI-AFK STABLE
// ======================

function startAntiAFK() {
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    
    antiAFKInterval = setInterval(() => {
        if (bot && isConnected) {
            performStableAntiAFK();
        }
    }, 45000);
}

function performStableAntiAFK() {
    if (!bot || !isConnected) return;
    
    const actions = [
        { action: 'look', args: [Math.random() * Math.PI * 2, (Math.random() * 0.3) - 0.15, false] },
        { action: 'control', key: 'forward', duration: 1500 },
        { action: 'control', key: 'left', duration: 1200 },
        { action: 'control', key: 'right', duration: 1200 },
        { action: 'control', key: 'back', duration: 1000 }
    ];
    
    const selected = actions[Math.floor(Math.random() * actions.length)];
    
    try {
        if (selected.action === 'look') {
            bot.look(selected.args[0], selected.args[1], selected.args[2]);
            console.log('🤖 Anti-AFK: Regarde autour');
        } else if (selected.action === 'control') {
            bot.setControlState(selected.key, true);
            setTimeout(() => {
                if (bot) bot.setControlState(selected.key, false);
            }, selected.duration);
            console.log(`🤖 Anti-AFK: ${selected.key} pendant ${selected.duration}ms`);
        }
    } catch (err) {
        console.log('⚠️ Erreur Anti-AFK ignorée:', err.message);
    }
}

// ======================
// COMMANDES SIMPLES ET STABLES
// ======================

const commands = {
    '!help': {
        desc: 'Liste des commandes',
        execute: () => bot.chat('📋 Commandes: !help, !pos, !ping, !afk [on/off], !info, !sit, !stand, !wave, !players, !status, !uptime')
    },
    '!pos': {
        desc: 'Position du bot',
        execute: () => {
            const pos = bot.entity.position;
            bot.chat(`📍 X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`);
        }
    },
    '!ping': {
        desc: 'Test de réponse',
        execute: () => bot.chat('🏓 Pong!')
    },
    '!afk': {
        desc: 'Gérer l\'anti-AFK',
        execute: (args) => {
            if (args[0] === 'on') {
                startAntiAFK();
                bot.chat('✅ Anti-AFK activé');
            } else if (args[0] === 'off') {
                if (antiAFKInterval) {
                    clearInterval(antiAFKInterval);
                    antiAFKInterval = null;
                }
                bot.chat('⏸️ Anti-AFK désactivé');
            } else {
                bot.chat('Usage: !afk on/off');
            }
        }
    },
    '!info': {
        desc: 'Informations du bot',
        execute: () => {
            const health = bot.health || 'N/A';
            const food = bot.food || 'N/A';
            bot.chat(`🤖 ${bot.username} | ❤️ ${health}/20 | 🍖 ${food}/20`);
        }
    },
    '!sit': {
        desc: 'S\'asseoir',
        execute: () => bot.chat('🪑 Je m\'assieds')
    },
    '!stand': {
        desc: 'Se lever',
        execute: () => bot.chat('🧍 Je me lève')
    },
    '!wave': {
        desc: 'Saluer',
        execute: () => bot.chat('👋 Bonjour !')
    },
    '!players': {
        desc: 'Liste des joueurs',
        execute: () => {
            const players = Object.keys(bot.players || {}).filter(p => p !== bot.username);
            if (players.length > 0) {
                bot.chat(`👥 Joueurs en ligne (${players.length}): ${players.join(', ')}`);
            } else {
                bot.chat('👥 Aucun autre joueur');
            }
        }
    },
    '!status': {
        desc: 'Statut du bot',
        execute: () => {
            const status = isConnected ? '✅ Connecté' : '❌ Déconnecté';
            const uptime = Math.floor((Date.now() - lastActivity) / 1000);
            bot.chat(`${status} | 🕐 Actif depuis ${uptime}s | 🔒 Whitelist: ${WHITELIST.length} joueurs`);
        }
    },
    '!uptime': {
        desc: 'Temps de fonctionnement',
        execute: () => {
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            bot.chat(`⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`);
        }
    },
    '!whitelist': {
        desc: 'Voir la whitelist',
        execute: () => bot.chat(`🔒 Whitelist: ${WHITELIST.join(', ')}`)
    }
};

// ======================
// GESTION DES COMMANDES
// ======================

function handleCommand(message, sender) {
    if (!isWhitelisted(sender)) {
        console.log(`🚫 Commande bloquée de ${sender}: ${message}`);
        return;
    }
    
    const args = message.trim().split(' ');
    const cmd = args[0].toLowerCase();
    
    if (!commands[cmd]) {
        bot.chat(`❌ Commande inconnue. Tape !help`);
        return;
    }
    
    console.log(`✅ Commande de ${sender}: ${message}`);
    
    try {
        commands[cmd].execute(args.slice(1));
    } catch (err) {
        console.log(`❌ Erreur commande ${cmd}:`, err.message);
        bot.chat('⚠️ Erreur lors de l\'exécution');
    }
}

// ======================
// GESTION CONNEXION STABLE
// ======================

function createBot() {
    console.log(`🚀 Connexion à ${config.host}:${config.port}...`);
    
    try {
        bot = mineflayer.createBot({
            host: config.host,
            port: config.port,
            username: config.username,
            version: config.version,
            auth: config.auth,
            
            // Configuration minimale pour stabilité
            connectTimeout: 45000,
            keepAlive: true,
            checkTimeoutInterval: 60000,
            hideErrors: false,
            
            // Options Forge minimales
            forgeOptions: {
                forgeMods: [
                    { modid: 'minecraft', version: config.version }
                ]
            }
        });
        
        setupBotEvents();
        
    } catch (err) {
        console.error('❌ Erreur création bot:', err.message);
        scheduleReconnect();
    }
}

function setupBotEvents() {
    // Événement de connexion
    bot.once('login', () => {
        console.log('✅ Authentification réussie');
    });
    
    bot.once('spawn', () => {
        isConnected = true;
        lastActivity = Date.now();
        console.log('📍 Bot spawné avec succès');
        
        // Démarrer l'anti-AFK après 10 secondes
        setTimeout(() => {
            if (isConnected) {
                startAntiAFK();
                console.log('🤖 Anti-AFK activé');
                bot.chat('✅ Bot connecté et stable ! Tape !help');
            }
        }, 10000);
    });
    
    // Gestion des messages
    bot.on('message', (jsonMsg) => {
        try {
            const message = jsonMsg.toString();
            const sender = jsonMsg.getSender ? jsonMsg.getSender() : null;
            
            if (sender && message.startsWith('!')) {
                handleCommand(message, sender);
            }
        } catch (err) {
            console.log('⚠️ Erreur traitement message:', err.message);
        }
    });
    
    // Événements de déconnexion
    bot.on('end', (reason) => {
        console.log(`🔌 Déconnexion: ${reason || 'Raison inconnue'}`);
        handleDisconnection();
    });
    
    bot.on('kicked', (reason) => {
        console.log(`👢 Kick: ${reason}`);
        handleDisconnection();
    });
    
    bot.on('error', (err) => {
        console.error(`❌ Erreur: ${err.message}`);
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
            handleDisconnection();
        }
    });
    
    // Événements utiles pour le debug
    bot.on('playerJoined', (player) => {
        console.log(`👋 ${player.username} a rejoint`);
    });
    
    bot.on('playerLeft', (player) => {
        console.log(`👋 ${player.username} a quitté`);
    });
}

// ======================
// GESTION RECONNEXION INTELLIGENTE
// ======================

let reconnectAttempts = 0;
let reconnectTimeout = null;

function handleDisconnection() {
    isConnected = false;
    
    if (antiAFKInterval) {
        clearInterval(antiAFKInterval);
        antiAFKInterval = null;
    }
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    
    reconnectAttempts++;
    
    // Réduction progressive des tentatives
    const maxAttempts = Math.min(20, 5 + reconnectAttempts);
    
    if (reconnectAttempts > maxAttempts) {
        console.log('🔄 Trop de tentatives, attente de 5 minutes...');
        reconnectAttempts = 0;
        reconnectTimeout = setTimeout(() => {
            createBot();
        }, 300000);
        return;
    }
    
    // Délai exponentiel avec limite
    const baseDelay = 5000;
    const maxDelay = 120000;
    const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts - 1), maxDelay);
    
    console.log(`🔄 Reconnexion dans ${Math.round(delay/1000)}s (tentative ${reconnectAttempts})`);
    
    reconnectTimeout = setTimeout(() => {
        if (bot) {
            try {
                bot.end();
                bot = null;
            } catch (err) {
                // Ignorer les erreurs de fermeture
            }
        }
        createBot();
    }, delay);
}

// ======================
// SANTÉ DU BOT
// ======================

// Vérifier périodiquement la connexion
setInterval(() => {
    if (isConnected && bot) {
        const inactiveTime = Date.now() - lastActivity;
        if (inactiveTime > 300000) { // 5 minutes d'inactivité
            console.log('⚠️ Aucune activité depuis 5 minutes, vérification...');
            // Tester la connexion avec une action simple
            try {
                bot.setControlState('jump', true);
                setTimeout(() => {
                    if (bot) bot.setControlState('jump', false);
                }, 100);
                lastActivity = Date.now();
            } catch (err) {
                console.log('⚠️ Connexion perdue, reconnexion...');
                handleDisconnection();
            }
        }
    }
}, 60000);

// ======================
// GESTION DES ARRÊTS
// ======================

process.on('SIGTERM', () => {
    console.log('🛑 Arrêt demandé (SIGTERM)');
    gracefulShutdown();
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt demandé (SIGINT)');
    gracefulShutdown();
});

function gracefulShutdown() {
    if (antiAFKInterval) {
        clearInterval(antiAFKInterval);
    }
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    
    if (bot) {
        try {
            bot.quit('Arrêt propre');
        } catch (err) {
            // Ignorer
        }
    }
    
    setTimeout(() => {
        console.log('👋 Bot arrêté');
        server.close(() => {
            process.exit(0);
        });
    }, 1000);
}

// ======================
// INFOS DE DÉMARRAGE
// ======================

console.log('🤖 Démarrage du Bot Stable');
console.log('==============================');
console.log(`Health check: Port ${WEB_PORT}`);
console.log(`Serveur Minecraft: ${config.host}:${config.port}`);
console.log(`Bot: ${config.username}`);
console.log(`Whitelist: ${WHITELIST.join(', ')}`);
console.log('==============================');
