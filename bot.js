const mineflayer = require('mineflayer')
const http = require('http')

// Keep-alive Railway
http.createServer((req, res) => {
  res.end('Bot Minecraft actif')
}).listen(3000, () => {
  console.log('🌐 Serveur web actif')
})

function startBot () {
  console.log('🚀 Lancement du bot...')

  const bot = mineflayer.createBot({
    host: 'TheOnly.exaroton.me',
    username: 'BotAFK',
    version: '1.21.1',
    auth: 'offline' // OBLIGATOIRE pour crack / exaroton
  })

  bot.on('login', () => {
    console.log('🔑 Login OK')
  })

  bot.once('spawn', () => {
    console.log('✅ Bot connecté et spawn')
    setInterval(() => {
      bot.swingArm('right')
    }, 10000)
  })

  bot.on('kicked', r => {
    console.log('❌ Kick:', r)
  })

  bot.on('error', e => {
    console.log('⚠️ Erreur:', e)
  })

  bot.on('end', () => {
    console.log('🔄 Reconnexion dans 15s...')
    setTimeout(startBot, 15000)
  })
}

startBot()
