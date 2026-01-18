const mineflayer = require('mineflayer');
const express = require('express');

// ======================
// CONFIGURATION
// ======================

const WEB_PORT = process.env.PORT || 3000;
const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        bot: bot ? 'connected' : 'disconnected',
        serverMods: detectedServerMods.length,
        timestamp: Date.now()
    });
});

app.get('/', (req, res) => {
    res.send('🤖 Minecraft Bot - Auto Mod Detection');
});

const server = app.listen(WEB_PORT, () => {
    console.log(`✅ Health check: http://localhost:${WEB_PORT}/health`);
    console.log('🚀 Démarrage avec détection automatique des mods...');
    setTimeout(connectWithModDetection, 2000);
});

// Configuration de base
const config = {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'RailwayBot',
    version: process.env.MC_VERSION || '1.20.1',
    auth: process.env.MC_AUTH || 'offline'
};

// Whitelist des commandes
const WHITELIST = (process.env.WHITELIST || 'Xrox_').split(',').map(name => name.trim());

// Mods de base (toujours présents)
const BASE_MODS = [
    { modid: 'minecraft', version: config.version },
    { modid: 'forge', version: '47.3.0' }
];

// Mods courants qu'on peut essayer d'ajouter automatiquement
const COMMON_MODS = [
    { modid: 'kotlinforforge', version: '4.10.0' },
    { modid: 'architectury', version: '9.1.12' },
    { modid: 'cloth_config', version: '11.1.118' },
    { modid: 'jei', version: '15.0.0.12' },
    { modid: 'journeymap', version: '5.9.18' },
    { modid: 'terrablender', version: '3.0.0.9' },
    { modid: 'selene', version: '2.10.4' },
    { modid: 'moonlight', version: '2.8.46' },
    { modid: 'create', version: '0.5.1.f' },
    { modid: 'flywheel', version: '0.6.10' },
    { modid: 'ae2', version: '15.0.9' },
    { modid: 'mekanism', version: '10.4.0.16' }
];

let bot = null;
let isConnected = false;
let detectedServerMods = [];
let currentModsList = [...BASE_MODS];
let connectionAttempt = 0;
const MAX_ATTEMPTS = 3;

// ======================
// DÉTECTION DES MODS
// ======================

function connectWithModDetection() {
    connectionAttempt++;
    console.log(`🔍 Tentative ${connectionAttempt}/${MAX_ATTEMPTS}`);
    console.log(`📦 Utilisation de ${currentModsList.length} mods: ${currentModsList.map(m => m.modid).join(', ')}`);
    
    if (bot) {
        try {
            bot.end();
            bot = null;
        } catch (e) {}
    }
    
    try {
        bot = mineflayer.createBot({
            host: config.host,
            port: config.port,
            username: config.username,
            version: config.version,
            auth: config.auth,
            connectTimeout: 20000,
            keepAlive: true,
            forgeOptions: { forgeMods: currentModsList }
        });
        
        setupModDetectionEvents();
        
    } catch (err) {
        console.error('❌ Erreur création bot:', err.message);
        handleConnectionFailure();
    }
}

function setupModDetectionEvents() {
    // Événement pour détecter les mods du serveur
    bot.on('modList', (mods) => {
        console.log('🎯 MODS DÉTECTÉS PAR LE SERVEUR:');
        detectedServerMods = mods.map(mod => ({
            modid: mod.modid,
            version: mod.version
        }));
        
        console.log(`📊 ${detectedServerMods.length} mods détectés:`);
        detectedServerMods.forEach((mod, i) => {
            console.log(`   ${i+1}. ${mod.modid} v${mod.version}`);
        });
        
        // Comparer avec nos mods actuels
        const missingMods = detectedServerMods.filter(serverMod => 
            !currentModsList.some(ourMod => ourMod.modid === serverMod.modid)
        );
        
        if (missingMods.length > 0) {
            console.log(`⚠️ ${missingMods.length} mods manquants dans notre configuration:`);
            missingMods.forEach(mod => {
                console.log(`   - ${mod.modid} (v${mod.version})`);
                
                // Vérifier si c'est un mod commun qu'on peut ajouter automatiquement
                const commonMod = COMMON_MODS.find(m => m.modid === mod.modid);
                if (commonMod) {
                    console.log(`     → Ajout automatique: ${commonMod.modid} v${commonMod.version}`);
                    currentModsList.push(commonMod);
                } else {
                    console.log(`     ❓ Mod inconnu, ajout avec version serveur`);
                    currentModsList.push(mod);
                }
            });
            
            // Si on a ajouté des mods, on se reconnecte
            if (connectionAttempt < MAX_ATTEMPTS) {
                console.log('🔄 Mods ajoutés, reconnexion améliorée...');
                setTimeout(() => connectWithModDetection(), 3000);
                return;
            }
        }
    });
    
    // Événement de kick avec raison
    bot.on('kicked', (reason) => {
        console.log('👢 Kick du serveur:', reason);
        
        // Analyser le message de kick pour détecter les mods manquants
        analyzeKickReason(reason);
        
        if (connectionAttempt < MAX_ATTEMPTS) {
            console.log(`🔄 Nouvelle tentative dans 5s... (${connectionAttempt}/${MAX_ATTEMPTS})`);
            setTimeout(() => connectWithModDetection(), 5000);
        } else {
            console.log('❌ Maximum de tentatives atteint.');
            startSafeMode();
        }
    });
    
    // Événement de connexion réussie
    bot.on('login', () => {
        console.log('✅ Authentification réussie');
    });
    
    bot.on('spawn', () => {
        isConnected = true;
        connectionAttempt = 0; // Réinitialiser le compteur
        console.log('📍 CONNEXION RÉUSSIE !');
        console.log('🎮 Bot connecté avec les mods suivants:');
        currentModsList.forEach((mod, i) => {
            console.log(`   ${i+1}. ${mod.modid} v${mod.version}`);
        });
        
        setupBotFeatures();
    });
    
    // Gestion des erreurs
    bot.on('error', (err) => {
        console.error('❌ Erreur:', err.message);
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
            console.log('📡 Problème de connexion réseau');
            handleConnectionFailure();
        }
    });
    
    bot.on('end', () => {
        console.log('🔌 Déconnecté');
        isConnected = false;
        handleConnectionFailure();
    });
}

function analyzeKickReason(reason) {
    const reasonStr = reason.toString().toLowerCase();
    
    // Détecter les mods manquants dans le message de kick
    if (reasonStr.includes('mod') || reasonStr.includes('forge')) {
        console.log('🔍 Analyse du kick - recherche de noms de mods...');
        
        // Expressions régulières pour trouver les mods
        const modPatterns = [
            /mod '([^']+)' (?:is missing|requires)/i,
            /missing mod(?:s)?:? ([^\n,.]+)/i,
            /required mod(?:s)?:? ([^\n,.]+)/i,
            /([a-z0-9_]+) v[0-9.]+/gi
        ];
        
        for (const pattern of modPatterns) {
            const matches = reasonStr.match(pattern);
            if (matches) {
                console.log('🎯 Mods détectés dans le message de kick:', matches);
                
                // Extraire les noms de mods
                matches.forEach(match => {
                    const modName = match.replace(/['"]/g, '').trim().toLowerCase();
                    if (modName && !['mod', 'missing', 'requires', 'required'].includes(modName)) {
                        console.log(`   → Mod suspecté: ${modName}`);
                        
                        // Chercher dans les mods communs
                        const commonMod = COMMON_MODS.find(m => 
                            m.modid.toLowerCase() === modName || 
                            m.modid.toLowerCase().includes(modName)
                        );
                        
                        if (commonMod && !currentModsList.some(m => m.modid === commonMod.modid)) {
                            console.log(`     ✅ Ajout: ${commonMod.modid}`);
                            currentModsList.push(commonMod);
                        }
                    }
                });
            }
        }
    }
}

function handleConnectionFailure() {
    if (connectionAttempt < MAX_ATTEMPTS) {
        console.log(`🔄 Nouvelle tentative dans 10s... (${connectionAttempt}/${MAX_ATTEMPTS})`);
        setTimeout(() => connectWithModDetection(), 10000);
    } else {
        console.log('❌ Échec de connexion après plusieurs tentatives');
        startSafeMode();
    }
}

// ======================
// MODE SÛR (sans mods)
// ======================

function startSafeMode() {
    console.log('🛡️ Passage en mode sûr (sans mods Forge)...');
    
    currentModsList = [{ modid: 'minecraft', version: config.version }];
    
    setTimeout(() => {
        bot = mineflayer.createBot({
            host: config.host,
            port: config.port,
            username: config.username,
            version: config.version,
            auth: config.auth,
            connectTimeout: 30000,
            keepAlive: true,
            // Pas d'options Forge pour le mode sûr
        });
        
        bot.on('spawn', () => {
            console.log('✅ Connecté en mode sûr');
            bot.chat('⚠️ Connecté en mode sûr (sans mods)');
            setupBotFeatures();
        });
        
        bot.on('error', (err) => {
            console.error('❌ Erreur mode sûr:', err.message);
        });
        
    }, 5000);
}

// ======================
// FONCTIONNALITÉS DU BOT
// ======================

function setupBotFeatures() {
    if (!bot) return;
    
    console.log('⚙️ Configuration des fonctionnalités du bot...');
    
    // Anti-AFK simple
    const antiAFKInterval = setInterval(() => {
        if (bot && isConnected) {
            const actions = ['forward', 'left', 'right', 'back'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(action, true);
            setTimeout(() => {
                if (bot) bot.setControlState(action, false);
            }, 1000);
        }
    }, 30000);
    
    // Gestion des commandes
    bot.on('chat', (username, message) => {
        if (!isWhitelisted(username)) {
            console.log(`🚫 Commande non autorisée de ${username}`);
            return;
        }
        
        if (message.startsWith('!')) {
            handleCommand(message, username);
        }
    });
    
    // Nettoyage à la déconnexion
    bot.on('end', () => {
        clearInterval(antiAFKInterval);
    });
}

// ======================
// COMMANDES
// ======================

function isWhitelisted(playerName) {
    return WHITELIST.some(name => name.toLowerCase() === playerName.toLowerCase());
}

function handleCommand(message, username) {
    const args = message.trim().split(' ');
    const command = args[0].toLowerCase();
    
    console.log(`📝 Commande de ${username}: ${message}`);
    
    switch(command) {
        case '!help':
            bot.chat('📋 Commandes: !help, !mods, !status, !players, !ping, !pos');
            break;
            
        case '!mods':
            if (detectedServerMods.length > 0) {
                bot.chat(`🎯 ${detectedServerMods.length} mods détectés: ${detectedServerMods.map(m => m.modid).slice(0, 5).join(', ')}${detectedServerMods.length > 5 ? '...' : ''}`);
            } else if (currentModsList.length > 0) {
                bot.chat(`⚙️ ${currentModsList.length} mods utilisés: ${currentModsList.map(m => m.modid).join(', ')}`);
            } else {
                bot.chat('🔧 Mode sûr - pas de mods configurés');
            }
            break;
            
        case '!status':
            const status = isConnected ? '✅ Connecté' : '❌ Déconnecté';
            bot.chat(`${status} | Mods: ${currentModsList.length} | Whitelist: ${WHITELIST.join(', ')}`);
            break;
            
        case '!players':
            const players = Object.keys(bot.players || {}).filter(p => p !== bot.username);
            if (players.length > 0) {
                bot.chat(`👥 ${players.length} joueurs: ${players.join(', ')}`);
            } else {
                bot.chat('👥 Aucun autre joueur');
            }
            break;
            
        case '!ping':
            bot.chat('🏓 Pong!');
            break;
            
        case '!pos':
            if (bot.entity) {
                const pos = bot.entity.position;
                bot.chat(`📍 X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`);
            }
            break;
            
        case '!reconnect':
            bot.chat('🔄 Reconnexion...');
            bot.end();
            setTimeout(() => connectWithModDetection(), 3000);
            break;
            
        case '!debug':
            bot.chat(`🔧 Debug: Host=${config.host}:${config.port}, Mods=${currentModsList.length}, ServerMods=${detectedServerMods.length}`);
            break;
            
        default:
            bot.chat(`❌ Commande inconnue. Tape !help`);
    }
}

// ======================
// DÉMARRAGE
// ======================

console.log('🤖 Minecraft Bot - Détection Auto Mods');
console.log('=====================================');
console.log(`Serveur: ${config.host}:${config.port}`);
console.log(`Bot: ${config.username}`);
console.log(`Version: ${config.version}`);
console.log(`Whitelist: ${WHITELIST.join(', ')}`);
console.log('=====================================');

// Gestion des arrêts
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt Railway...');
    if (bot) bot.quit();
    server.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt manuel...');
    if (bot) bot.quit();
    server.close();
    process.exit(0);
});
