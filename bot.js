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
    
    // Configuration Forge
    forgeOptions: {
        forgeMods: [
            {
                modid: 'minecraft',
                version: '1.20.1'
            },
            {
                modid: 'forge',
                version: '47.3.0'
            }
        ]
    }
};

// Configuration Railway
const WEB_PORT = process.env.PORT || 3000;

// WHITELIST des joueurs autorisés à utiliser les commandes
// Par défaut: Xrox_ (tu peux ajouter d'autres joueurs ici)
// Format: ['NomJoueur1', 'NomJoueur2', ...]
const WHITELIST = (process.env.WHITELIST || 'Xrox_').split(',').map(name => name.trim());
console.log('🔒 Whitelist activée. Joueurs autorisés:', WHITELIST);

// Serveur web pour Railway
const app = express();
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        bot: bot ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        whitelist: WHITELIST
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
let antiAFKInterval;
let followTarget = null;
let isFollowing = false;

// ======================
// ANTI-AFK SIMPLIFIÉ
// ======================

function startAntiAFK() {
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    
    antiAFKInterval = setInterval(() => {
        if (bot && isConnected && !isFollowing) {
            performSimpleMovement();
        }
    }, 30000);
}

function performSimpleMovement() {
    if (!bot || !isConnected || isFollowing) return;
    
    const actions = ['walkForward', 'walkBackward', 'strafeLeft', 'strafeRight', 'lookAround'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    switch(action) {
        case 'walkForward':
            bot.setControlState('forward', true);
            setTimeout(() => {
                if (bot) bot.setControlState('forward', false);
            }, 2000);
            console.log('🤖 Déplacement: Avance 2s');
            break;
            
        case 'walkBackward':
            bot.setControlState('back', true);
            setTimeout(() => {
                if (bot) bot.setControlState('back', false);
            }, 1500);
            console.log('🤖 Déplacement: Recule 1.5s');
            break;
            
        case 'strafeLeft':
            bot.setControlState('left', true);
            setTimeout(() => {
                if (bot) bot.setControlState('left', false);
            }, 1800);
            console.log('🤖 Déplacement: Gauche 1.8s');
            break;
            
        case 'strafeRight':
            bot.setControlState('right', true);
            setTimeout(() => {
                if (bot) bot.setControlState('right', false);
            }, 1800);
            console.log('🤖 Déplacement: Droite 1.8s');
            break;
            
        case 'lookAround':
            const yaw = Math.random() * Math.PI * 2;
            const pitch = (Math.random() * 0.4) - 0.2;
            bot.look(yaw, pitch, false);
            console.log('🤖 Déplacement: Regarde autour');
            break;
    }
}

// ======================
// VÉRIFICATION WHITELIST
// ======================

function isPlayerWhitelisted(playerName) {
    return WHITELIST.some(name => 
        name.toLowerCase() === playerName.toLowerCase()
    );
}

// ======================
// COMMANDES
// ======================

function handleCommand(message, username) {
    // Vérifier si le joueur est dans la whitelist
    if (!isPlayerWhitelisted(username)) {
        console.log(`🚫 Commande bloquée: ${username} n'est pas dans la whitelist`);
        bot.whisper(username, '❌ Tu n\'es pas autorisé à utiliser les commandes.');
        return;
    }
    
    const args = message.trim().split(' ');
    const command = args[0].toLowerCase();
    
    console.log(`✅ Commande exécutée par ${username}: ${message}`);
    
    switch(command) {
        case '!help':
            bot.chat('📋 Commandes: !pos, !ping, !follow [joueur], !stop, !tp [x] [y] [z], !come, !sit, !stand, !wave, !dance, !info, !time, !weather, !players, !afk [on/off], !home, !spawn, !whitelist');
            break;
            
        case '!pos':
            const pos = bot.entity.position;
            bot.chat(`📍 Position: X=${Math.floor(pos.x)}, Y=${Math.floor(pos.y)}, Z=${Math.floor(pos.z)}`);
            break;
            
        case '!ping':
            bot.chat('🏓 Pong! Bot actif');
            break;
            
        case '!follow':
            if (args[1]) {
                followPlayer(args[1]);
            } else {
                bot.chat('❌ Usage: !follow [joueur]');
            }
            break;
            
        case '!stop':
            stopFollowing();
            bot.pathfinder.setGoal(null);
            bot.chat('🛑 Arrêt des mouvements');
            break;
            
        case '!tp':
            if (args.length >= 4) {
                teleport(parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]));
            } else {
                bot.chat('❌ Usage: !tp [x] [y] [z]');
            }
            break;
            
        case '!come':
            if (username && username !== bot.player.username) {
                const player = bot.players[username];
                if (player && player.entity) {
                    const pos = player.entity.position;
                    teleport(pos.x, pos.y, pos.z);
                }
            }
            break;
            
        case '!sit':
            bot.chat('🪑 Je m\'assieds');
            break;
            
        case '!stand':
            bot.chat('🧍 Je me lève');
            break;
            
        case '!wave':
            bot.chat('👋 Salut tout le monde !');
            break;
            
        case '!dance':
            bot.chat('💃🕺 Je danse !');
            break;
            
        case '!info':
            bot.chat(`🤖 Bot: ${bot.player.username} | Santé: ${bot.health}/20 | Nourriture: ${bot.food}/20`);
            break;
            
        case '!time':
            if (bot.time) {
                const time = bot.time.timeOfDay;
                const hours = Math.floor(time / 1000);
                const minutes = Math.floor((time % 1000) / 16.67);
                bot.chat(`⏰ Heure: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            }
            break;
            
        case '!weather':
            if (bot.isRaining) {
                bot.chat('🌧️ Il pleut');
            } else {
                bot.chat('☀️ Il fait beau');
            }
            break;
            
        case '!players':
            const players = Object.keys(bot.players).filter(name => name !== bot.player.username);
            const whitelistedPlayers = players.filter(player => isPlayerWhitelisted(player));
            const nonWhitelistedPlayers = players.filter(player => !isPlayerWhitelisted(player));
            
            if (players.length > 0) {
                let message = `👥 Joueurs (${players.length}): `;
                if (whitelistedPlayers.length > 0) {
                    message += `✅ ${whitelistedPlayers.join(', ')}`;
                    if (nonWhitelistedPlayers.length > 0) {
                        message += ` | ❌ ${nonWhitelistedPlayers.length} non-autorisés`;
                    }
                } else {
                    message += `❌ ${players.length} non-autorisés`;
                }
                bot.chat(message);
            } else {
                bot.chat('👥 Aucun autre joueur en ligne');
            }
            break;
            
        case '!afk':
            if (args[1] === 'on') {
                startAntiAFK();
                bot.chat('✅ Anti-AFK activé');
            } else if (args[1] === 'off') {
                if (antiAFKInterval) {
                    clearInterval(antiAFKInterval);
                    antiAFKInterval = null;
                }
                bot.chat('⏸️ Anti-AFK désactivé');
            } else {
                bot.chat('❌ Usage: !afk [on/off]');
            }
            break;
            
        case '!home':
            teleport(0, 64, 0);
            bot.chat('🏠 Téléportation à la maison');
            break;
            
        case '!spawn':
            teleport(0, 64, 0);
            bot.chat('🗺️ Téléportation au spawn');
            break;
            
        case '!whitelist':
            if (args[1] === 'list') {
                bot.chat(`✅ Whitelist: ${WHITELIST.join(', ')}`);
            } else if (args[1] === 'check' && args[2]) {
                const checkPlayer = args[2];
                const isWhitelisted = isPlayerWhitelisted(checkPlayer);
                bot.chat(`🔍 ${checkPlayer}: ${isWhitelisted ? '✅ Dans la whitelist' : '❌ Non autorisé'}`);
            } else {
                bot.chat('📋 Whitelist commands: !whitelist list, !whitelist check [joueur]');
            }
            break;
            
        default:
            if (command.startsWith('!')) {
                bot.chat(`❌ Commande inconnue: ${command}. Tape !help pour la liste`);
            }
    }
}

function followPlayer(playerName) {
    const player = bot.players[playerName];
    
    if (!player || !player.entity) {
        bot.chat(`❌ Joueur ${playerName} non trouvé`);
        return;
    }
    
    followTarget = playerName;
    isFollowing = true;
    
    bot.chat(`👥 Je te suis, ${playerName}!`);
    
    if (antiAFKInterval) {
        clearInterval(antiAFKInterval);
        antiAFKInterval = null;
    }
    
    const mcData = minecraftData(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    
    const goal = new goals.GoalFollow(player.entity, 3);
    bot.pathfinder.setGoal(goal, true);
}

function stopFollowing() {
    isFollowing = false;
    followTarget = null;
    bot.pathfinder.setGoal(null);
    startAntiAFK();
}

function teleport(x, y, z) {
    if (bot.game.gameMode === 'creative' || bot.game.gameMode === 'spectator') {
        bot.chat(`/tp ${x} ${y} ${z}`);
    } else {
        const mcData = minecraftData(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);
        
        const goal = new goals.GoalNear(x, y, z, 1);
        bot.pathfinder.setGoal(goal);
        bot.chat(`📍 Déplacement vers X=${x}, Y=${y}, Z=${z}`);
    }
}

// ======================
// GESTION PRINCIPALE
// ======================

function createBot() {
    console.log('🚀 Tentative de connexion...');
    console.log(`📡 Serveur: ${config.host}:${config.port}`);
    console.log(`👤 Bot: ${config.username}`);
    
    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version,
        auth: config.auth,
        forgeOptions: config.forgeOptions,
        connectTimeout: 30000,
        keepAlive: true,
        checkTimeoutInterval: 30000
    });

    bot.loadPlugin(pathfinder);

    // ======================
    // ÉVÉNEMENTS
    // ======================

    bot.on('login', () => {
        console.log('✅ Authentifié');
    });

    bot.on('spawn', () => {
        isConnected = true;
        console.log('📍 Bot spawné');
        
        const mcData = minecraftData(bot.version);
        const movements = new Movements(bot, mcData);
        movements.canDig = false;
        movements.allowParkour = false;
        bot.pathfinder.setMovements(movements);
        
        startAntiAFK();
        
        setTimeout(() => {
            if (bot && isConnected) {
                bot.chat('🤖 Bot connecté ! (Commandes réservées aux joueurs whitelist)');
            }
        }, 2000);
    });

    bot.on('message', (jsonMsg) => {
        const message = jsonMsg.toString();
        const sender = jsonMsg.getSender ? jsonMsg.getSender() : null;
        
        console.log(`💬 ${sender ? sender + ': ' : ''}${message}`);
        
        if (message.startsWith('!')) {
            if (!sender || sender === '') {
                console.log('🚫 Commande ignorée: aucun expéditeur');
                return;
            }
            
            if (isPlayerWhitelisted(sender)) {
                handleCommand(message, sender);
            } else {
                console.log(`🚫 Commande bloquée: ${sender} n'est pas dans la whitelist`);
                // Option: envoyer un message privé au joueur
                // bot.whisper(sender, '❌ Tu n\'es pas autorisé à utiliser les commandes.');
            }
        }
    });

    bot.on('whisper', (username, message) => {
        console.log(`📩 ${username}: ${message}`);
        
        if (message.startsWith('!')) {
            if (isPlayerWhitelisted(username)) {
                handleCommand(message, username);
            } else {
                console.log(`🚫 Whisper command bloqué: ${username} n'est pas dans la whitelist`);
                bot.whisper(username, '❌ Tu n\'es pas autorisé à utiliser les commandes.');
            }
        }
    });

    bot.on('playerJoined', (player) => {
        console.log(`👋 ${player.username} a rejoint`);
        
        // Salutation automatique pour les joueurs whitelist
        if (isPlayerWhitelisted(player.username)) {
            setTimeout(() => {
                if (bot && isConnected) {
                    bot.whisper(player.username, '👋 Bienvenue ! Je suis ton bot. Tape !help pour les commandes.');
                }
            }, 3000);
        }
    });

    bot.on('playerLeft', (player) => {
        console.log(`👋 ${player.username} a quitté`);
        if (followTarget === player.username) {
            stopFollowing();
            bot.chat(`👋 ${player.username} est parti, j'arrête de suivre`);
        }
    });

    bot.on('kicked', (reason) => {
        console.log(`👢 Kick: ${reason}`);
        isConnected = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        handleDisconnection();
    });

    bot.on('error', (err) => {
        console.error(`❌ Erreur: ${err.message}`);
        isConnected = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        handleDisconnection();
    });

    bot.on('end', (reason) => {
        console.log(`🔌 Déconnecté: ${reason || 'inconnue'}`);
        isConnected = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        handleDisconnection();
    });
}

// ======================
// GESTION RECONNEXION
// ======================

let reconnectAttempts = 0;
const MAX_RECONNECTS = 10;

function handleDisconnection() {
    reconnectAttempts++;
    
    if (reconnectAttempts > MAX_RECONNECTS) {
        console.log('❌ Nombre maximum de reconnexions atteint');
        console.log('🔄 Redémarrage complet dans 60 secondes...');
        setTimeout(() => {
            process.exit(1);
        }, 60000);
        return;
    }
    
    const delay = Math.min(reconnectAttempts * 10000, 60000);
    
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

if (!process.env.MC_HOST) {
    console.warn('⚠️ MC_HOST non défini, utilisation de la valeur par défaut');
}

console.log('🤖 Démarrage du bot Minecraft Forge');
console.log('📋 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Username: ${config.username}`);
console.log(`   Version: ${config.version}`);
console.log(`   Whitelist: ${WHITELIST.join(', ')}`);
console.log('========================================');

createBot();

// Arrêt propre
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, arrêt propre...');
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    if (bot) bot.quit('Arrêt Railway');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu, arrêt propre...');
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    if (bot) bot.quit('Arrêt manuel');
    process.exit(0);
});
