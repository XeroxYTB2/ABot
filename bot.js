const mineflayer = require('mineflayer')
const http = require('http')

// Keep-alive pour Railway
http.createServer((req, res) => {
  res.end('Bot Minecraft actif')
}).listen(3000, () => {
  console.log('🌐 Serveur web actif sur le port 3000')
})

function startBot() {
  console.log('🚀 Lancement du bot...')

  const bot = mineflayer.createBot({
    host: 'Xerox200IQYTB.aternos.me', // ton serveur
    port: 33921,                 // port spécifique
    username: 'BotAFK',           // pseudo du bot
    version: '1.20.1',            // correspond à ton serveur
    auth: 'offline'               // obligatoire pour crack
  })

  bot.on('login', () => console.log('🔑 Login OK'))
  
  bot.once('spawn', () => {
    console.log('✅ Bot connecté et spawn')
    setInterval(() => bot.swingArm('right'), 10000) // tape toutes les 10 sec
  })

  bot.on('kicked', r => console.log('❌ Kick:', r))
  bot.on('error', e => console.log('⚠️ Erreur:', e))

  bot.on('end', () => {
    console.log('🔄 Reconnexion dans 15s...')
    setTimeout(startBot, 15000)
  })
}

// Lancement initial
startBot()
