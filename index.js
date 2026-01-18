const mineflayer = require('mineflayer')
const http = require('http')

// Keep-alive Railway
http.createServer((req, res) => {
  res.end('Bot Minecraft actif')
}).listen(3000, () => {
  console.log('🌐 Serveur web actif (port 3000)')
})

function startBot () {
  console.log('🚀 Lancement du bot...')

  const bot = mineflayer.createBot({
    host: 'TheOnly.aternos.me',
    port: 26754,
    username: 'BotAFK',
    version: '1.20.1',
    auth: 'offline'
  })

  bot.on('login', () => {
    console.log('🔑 Login réussi')
  })

  bot.once('spawn', () => {
    console.log('✅ Bot connecté et spawn')

    // 🔹 Anti-AFK SAFE (aucune interaction)
    setInterval(() => {
      // petit mouvement avant
      bot.setControlState('forward', true)
      setTimeout(() => bot.setControlState('forward', false), 300)

      // petit saut
      setTimeout(() => {
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 200)
      }, 500)

    }, 15000) // toutes les 15 secondes
  })

  bot.on('kicked', reason => {
    console.log('❌ Kick:', reason)
  })

  bot.on('error', err => {
    console.log('⚠️ Erreur:', err)
  })

  bot.on('end', () => {
    console.log('🔄 Reconnexion dans 15 secondes...')
    setTimeout(startBot, 15000)
  })
}

startBot()