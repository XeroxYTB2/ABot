const mineflayer = require('mineflayer');
const express = require('express');

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

// Configuration Railway
const WEB_PORT = process.env.PORT || 3000;

// Serveur web minimal
const app = express();
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        bot: bot ? 'connected' : 'disconnected',
        whitelist: WHITELIST
    });
});

app.get('/', (req, res) => {
    res.send('🤖 Minecraft Bot (Stable Edition)');
});

app.listen(WEB_PORT, () => {
    console.log(`🌐 Health check: http://localhost:${WEB_PORT}/health`);
});

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
    }, 45000); // 45 secondes pour être safe
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
            const uptime = Math.floor(process.uptime
