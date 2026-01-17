// bot.js
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');

// Configuration
const config = {
    host: 'localhost', // Adresse du serveur
    port: 25565, // Port du serveur
    username: 'Bot', // Nom du bot
    version: '1.20.1', // Version de Minecraft
    auth: 'offline' // 'offline' ou 'microsoft'
};

// Options spécifiques Forge
const forgeOptions = {
    forgeMods: [
        {
            // Liste des mods côté client que le bot prétend avoir
            // Important: Doit correspondre aux mods du serveur
            name: 'minecraft',
            version: '1.20.1'
        }
        // Ajouter d'autres mods si nécessaire
    ]
};

let bot;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

function createBot() {
    console.log('🚀 Création du bot...');
    
    bot = mineflayer.createBot({
        ...config,
        ...forgeOptions
    });

    // Charger le pathfinder
    bot.loadPlugin(pathfinder);

    // Événement de connexion réussie
    bot.on('login', () => {
        console.log('✅ Connecté au serveur');
        reconnectAttempts = 0;
        
        // Afficher les informations du serveur
        console.log(`🌍 Serveur: ${bot.game.serverBrand || 'Forge 1.20.1'}`);
        console.log(`👤 Nom: ${bot.player.username}`);
        console.log(`📍 Position: ${bot.entity.position}`);
    });

    // Événement de spawn
    bot.on('spawn', () => {
        console.log('🎮 Bot spawné dans le monde');
        
        // Activer les mouvements
        const mcData = minecraftData(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);
    });

    // Gestion du chat
    bot.on('message', (message) => {
        const text = message.toString().trim();
        console.log(`💬 Chat: ${text}`);
        
        // Répondre aux commandes
        if (text.includes('!ping')) {
            bot.chat('🏓 Pong!');
        }
        
        if (text.includes('!pos')) {
            const pos = bot.entity.position;
            bot.chat(`📍 Position: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
        }
        
        if (text.includes('!follow')) {
            const playerName = text.split(' ')[1];
            followPlayer(playerName);
        }
        
        if (text.includes('!stop')) {
            bot.pathfinder.setGoal(null);
            bot.chat('🛑 Arrêt du mouvement');
        }
    });

    // Gestion des erreurs
    bot.on('error', (err) => {
        console.error('❌ Erreur:', err.message);
    });

    bot.on('kicked', (reason) => {
        console.log('👢 Kick du serveur:', reason);
        attemptReconnect();
    });

    bot.on('end', () => {
        console.log('🔌 Déconnecté du serveur');
        attemptReconnect();
    });

    // Événements de santé et nourriture
    bot.on('health', () => {
        if (bot.health <= 10) {
            console.log(`⚠️ Santé faible: ${bot.health}/20`);
        }
    });

    bot.on('death', () => {
        console.log('💀 Le bot est mort');
    });

    // Anti-AFK: bouger légèrement toutes les minutes
    setInterval(() => {
        if (bot.entity && !bot.pathfinder.isMoving()) {
            bot.setControlState('forward', true);
            setTimeout(() => {
                bot.setControlState('forward', false);
            }, 1000);
        }
    }, 60000);
}

// Fonction pour suivre un joueur
function followPlayer(playerName) {
    const player = bot.players[playerName];
    
    if (!player || !player.entity) {
        bot.chat(`❌ Joueur ${playerName} non trouvé`);
        return;
    }
    
    bot.chat(`👥 Je te suis, ${playerName}!`);
    
    const goal = new goals.GoalFollow(player.entity, 2);
    bot.pathfinder.setGoal(goal, true);
}

// Tentative de reconnexion
function attemptReconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(30000, reconnectAttempts * 5000); // Max 30 secondes
        
        console.log(`🔄 Reconnexion dans ${delay/1000}s... (tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        setTimeout(() => {
            createBot();
        }, delay);
    } else {
        console.log('❌ Nombre maximum de tentatives de reconnexion atteint');
        process.exit(1);
    }
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du bot...');
    if (bot) {
        bot.quit();
    }
    process.exit(0);
});

// Démarrer le bot
createBot();
