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
let antiAFKInterval;
let isCreativeMode = false;
let isFlying = false;

// ======================
// SYSTÈME ANTI-AFK POUR CREATIF
// ======================

function startAntiAFK() {
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    
    antiAFKInterval = setInterval(() => {
        if (bot && isConnected) {
            performCreativeAntiAFKAction();
        }
    }, 15000); // Toutes les 15 secondes
}

function performCreativeAntiAFKAction() {
    if (!bot || !isConnected) return;
    
    const actions = isFlying ? [
        'flyMove',
        'hover',
        'slowFly',
        'lookAround',
        'gentleLanding',
        'creativeJump'
    ] : [
        'gentleMove',
        'lookAround',
        'creativeJump',
        'sneakToggle',
        'headMovement',
        'startFlying'
    ];
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    switch(action) {
        case 'gentleMove':
            // Mouvement doux au sol
            const directions = ['forward', 'left', 'right'];
            const dir = directions[Math.floor(Math.random() * directions.length)];
            bot.setControlState(dir, true);
            setTimeout(() => {
                if (bot) bot.setControlState(dir, false);
            }, 1000 + Math.random() * 1000);
            console.log(`🤖 Anti-AFK Créatif: Marche ${dir}`);
            break;
            
        case 'lookAround':
            // Regarder autour doucement
            const yaw = bot.entity.yaw + (Math.random() * 1.5 - 0.75);
            const pitch = Math.max(-0.5, Math.min(0.5, bot.entity.pitch + (Math.random() * 0.5 - 0.25)));
            bot.look(yaw, pitch, false);
            console.log(`🤖 Anti-AFK Créatif: Regarde autour`);
            break;
            
        case 'creativeJump':
            // Petit saut léger (pas de spam)
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot) bot.setControlState('jump', false);
            }, 200);
            console.log('🤖 Anti-AFK Créatif: Petit saut');
            break;
            
        case 'sneakToggle':
            // S'accroupir/désaccroupir rapidement
            bot.setControlState('sneak', true);
            setTimeout(() => {
                if (bot) bot.setControlState('sneak', false);
            }, 1000);
            console.log('🤖 Anti-AFK Créatif: S\'accroupit');
            break;
            
        case 'headMovement':
            // Mouvement de tête réaliste mais doux
            let lookCount = 0;
            const lookInterval = setInterval(() => {
                if (lookCount >= 3) {
                    clearInterval(lookInterval);
                    return;
                }
                const yaw = bot.entity.yaw + (Math.random() * 0.5 - 0.25);
                const pitch = Math.max(-0.3, Math.min(0.3, bot.entity.pitch + (Math.random() * 0.3 - 0.15)));
                bot.look(yaw, pitch, false);
                lookCount++;
            }, 500);
            console.log('🤖 Anti-AFK Créatif: Mouvements de tête doux');
            break;
            
        case 'startFlying':
            // Démarrer le vol si en créatif
            if (isCreativeMode && !isFlying) {
                bot.setControlState('jump', true);
                setTimeout(() => {
                    if (bot) {
                        bot.setControlState('jump', false);
                        isFlying = true;
                    }
                }, 1000);
                console.log('🤖 Anti-AFK Créatif: Démarre le vol');
            }
            break;
            
        case 'flyMove':
            // Mouvement en vol doux
            const flyDirections = ['forward', 'left', 'right', 'back'][Math.floor(Math.random() * 4)];
            bot.setControlState(flyDirections, true);
            setTimeout(() => {
                if (bot) bot.setControlState(flyDirections, false);
            }, 1500 + Math.random() * 1500);
            console.log(`🤖 Anti-AFK Créatif: Vol ${flyDirections}`);
            break;
            
        case 'hover':
            // Vol stationnaire avec petits ajustements
            bot.setControlState('jump', true); // Pour monter légèrement
            setTimeout(() => {
                if (bot) {
                    bot.setControlState('jump', false);
                    bot.setControlState('sneak', true); // Pour descendre légèrement
                    setTimeout(() => {
                        if (bot) bot.setControlState('sneak', false);
                    }, 500);
                }
            }, 500);
            console.log('🤖 Anti-AFK Créatif: Vol stationnaire');
            break;
            
        case 'slowFly':
            // Vol lent avec changement d'altitude
            const altChange = Math.random() > 0.5 ? 'jump' : 'sneak';
            bot.setControlState('forward', true);
            bot.setControlState(altChange, true);
            setTimeout(() => {
                if (bot) {
                    bot.setControlState('forward', false);
                    bot.setControlState(altChange, false);
                }
            }, 2000);
            console.log(`🤖 Anti-AFK Créatif: Vol lent (${altChange === 'jump' ? 'montée' : 'descente'})`);
            break;
            
        case 'gentleLanding':
            // Atterrissage en douceur
            if (isFlying) {
                bot.setControlState('sneak', true);
                setTimeout(() => {
                    if (bot) {
                        bot.setControlState('sneak', false);
                        isFlying = false;
                    }
                }, 1500);
                console.log('🤖 Anti-AFK Créatif: Atterrissage en douceur');
            }
            break;
    }
}

// ======================
// FONCTIONS PRINCIPALES
// ======================

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
    // GESTION DES ÉVÉNEMENTS (ADAPTÉ POUR CREATIF)
    // ======================

    bot.on('login', () => {
        console.log('✅ Authentifié sur le serveur');
        console.log(`🎮 Version: ${bot.version}`);
        
        // Démarrer l'anti-AFK immédiatement
        if (antiAFKInterval) clearInterval(antiAFKInterval);
    });

    bot.on('spawn', () => {
        isConnected = true;
        console.log('📍 Bot spawné dans le monde');
        console.log(`🌍 Dimension: ${bot.game.dimension}`);
        
        // Détecter le mode de jeu
        updateGameMode();
        
        // Initialiser les mouvements (mais en créatif on limite les déplacements)
        const mcData = minecraftData(bot.version);
        const movements = new Movements(bot, mcData);
        movements.canDig = false; // Désactiver le minage en créatif
        movements.allowParkour = false; // Désactiver le parkour
        bot.pathfinder.setMovements(movements);
        
        // Démarrer le système anti-AFK adapté
        startAntiAFK();
        
        // Dire bonjour dans le chat
        setTimeout(() => {
            if (bot && isConnected) {
                bot.chat('Bonjour ! Bot créatif actif 🤖 (Mouvements sécurisés)');
            }
        }, 3000);
    });

    // Détecter les changements de mode de jeu
    bot.on('game', () => {
        updateGameMode();
    });

    function updateGameMode() {
        if (bot.game.gameMode === 'creative' || bot.game.gameMode === 'spectator') {
            isCreativeMode = true;
            console.log('🎮 Mode détecté: Créatif/Spectateur');
            console.log('⚠️ Anti-AFK adapté pour le mode créatif');
        } else {
            isCreativeMode = false;
            console.log('🎮 Mode détecté: Survie/Aventure');
        }
    }

    bot.on('message', (jsonMsg) => {
        const message = jsonMsg.toString();
        console.log(`💬 ${message}`);
        
        // Commandes adaptées pour créatif
        if (message.includes('!help')) {
            bot.chat('Commandes: !pos, !ping, !fly [on/off], !afk [on/off], !mode');
        }
        
        if (message.includes('!ping')) {
            bot.chat('🏓 Pong! (Bot créatif)');
        }
        
        if (message.includes('!pos')) {
            const pos = bot.entity.position;
            const mode = isCreativeMode ? 'Créatif' : 'Survie';
            bot.chat(`📍 ${mode} | X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`);
        }
        
        if (message.includes('!fly on') && isCreativeMode) {
            isFlying = true;
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot) bot.setControlState('jump', false);
            }, 1000);
            bot.chat('🪽 Mode vol activé');
        }
        
        if (message.includes('!fly off') && isFlying) {
            isFlying = false;
            bot.setControlState('sneak', true);
            setTimeout(() => {
                if (bot) bot.setControlState('sneak', false);
            }, 1000);
            bot.chat('👣 Mode vol désactivé');
        }
        
        if (message.includes('!afk on')) {
            startAntiAFK();
            bot.chat('✅ Anti-AFK activé');
        }
        
        if (message.includes('!afk off')) {
            if (antiAFKInterval) {
                clearInterval(antiAFKInterval);
                antiAFKInterval = null;
            }
            bot.chat('⏸️ Anti-AFK désactivé');
        }
        
        if (message.includes('!mode')) {
            const mode = isCreativeMode ? 'Créatif' : 'Survie';
            const flying = isFlying ? ' (Vol actif)' : ' (Au sol)';
            bot.chat(`🎮 Mode actuel: ${mode}${flying}`);
        }
    });

    bot.on('whisper', (username, message) => {
        console.log(`📩 Message privé de ${username}: ${message}`);
        // Répondre aux whispers
        if (message.toLowerCase().includes('salut') || message.toLowerCase().includes('hello')) {
            const mode = isCreativeMode ? 'créatif' : 'survie';
            bot.whisper(username, `Salut ! Je suis un bot AFK en mode ${mode} 🤖`);
        }
    });

    bot.on('playerJoined', (player) => {
        console.log(`👋 ${player.username} a rejoint`);
        // Saluer les nouveaux joueurs (aléatoirement et poliment)
        if (Math.random() > 0.8) {
            setTimeout(() => {
                if (bot && isConnected) {
                    bot.chat(`Bienvenue ${player.username} !`);
                }
            }, 2000);
        }
    });

    bot.on('playerLeft', (player) => {
        console.log(`👋 ${player.username} a quitté`);
    });

    bot.on('kicked', (reason) => {
        console.log(`👢 Kick: ${reason}`);
        isConnected = false;
        isFlying = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        handleDisconnection();
    });

    bot.on('error', (err) => {
        console.error(`❌ Erreur: ${err.message}`);
        isConnected = false;
        isFlying = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        handleDisconnection();
    });

    bot.on('end', (reason) => {
        console.log(`🔌 Déconnecté: ${reason || 'No reason provided'}`);
        isConnected = false;
        isFlying = false;
        if (antiAFKInterval) clearInterval(antiAFKInterval);
        handleDisconnection();
    });

    // DÉSACTIVER la gestion de la santé/faim en créatif
    if (!isCreativeMode) {
        bot.on('health', () => {
            if (bot.health < 10) {
                console.log(`⚠️ Santé faible: ${bot.health}/20`);
            }
        });
    }

    // Événement de mort (peut arriver même en créatif si /kill)
    bot.on('death', () => {
        console.log('💀 Le bot est mort');
        isFlying = false;
        // Respawn automatique
        setTimeout(() => {
            if (bot) {
                console.log('🔄 Respawn automatique...');
            }
        }, 3000);
    });

    // Événement pour détecter les chutes (sécurité)
    bot.on('falling', () => {
        if (isCreativeMode && !isFlying) {
            console.log('⚠️ Chute détectée en créatif, activation du vol');
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot) bot.setControlState('jump', false);
                isFlying = true;
            }, 500);
        }
    });
}

// ======================
// GESTION RECONNEXION
// ======================

let reconnectAttempts = 0;
const MAX_RECONNECTS = 20;

function handleDisconnection() {
    if (antiAFKInterval) {
        clearInterval(antiAFKInterval);
        antiAFKInterval = null;
    }
    
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

console.log('🤖 Démarrage du bot Minecraft Forge (Mode Créatif) sur Railway');
console.log('📋 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Username: ${config.username}`);
console.log(`   Version: ${config.version}`);
console.log('========================================');
console.log('⚠️  MODE CRÉATIF DÉTECTÉ - COMPORTEMENT ADAPTÉ');
console.log('✅  Mouvements doux et sécurisés');
console.log('✅  Pas de surveillance santé/faim');
console.log('✅  Gestion du vol en créatif');
console.log('========================================');

// Démarrer le bot
createBot();

// Gestion des arrêts propres
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, arrêt propre...');
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    if (bot) {
        // Atterrir avant de quitter
        if (isFlying) {
            bot.setControlState('sneak', true);
            setTimeout(() => {
                if (bot) {
                    bot.setControlState('sneak', false);
                    bot.quit('Arrêt Railway');
                }
            }, 1000);
        } else {
            bot.quit('Arrêt Railway');
        }
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu, arrêt propre...');
    if (antiAFKInterval) clearInterval(antiAFKInterval);
    if (bot) {
        // Atterrir avant de quitter
        if (isFlying) {
            bot.setControlState('sneak', true);
            setTimeout(() => {
                if (bot) {
                    bot.setControlState('sneak', false);
                    bot.quit('Arrêt manuel');
                }
            }, 1000);
        } else {
            bot.quit('Arrêt manuel');
        }
    }
    process.exit(0);
});
