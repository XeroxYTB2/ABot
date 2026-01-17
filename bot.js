const mineflayer = require('mineflayer')
const http = require('http')

http.createServer((req, res) => {
  res.end('Bot Minecraft actif')
}).listen(3000)

function startBot () {
  console.log('🚀 Lancement du bot...')

  const bot = mineflayer.createBot({
    host: 'TheOnly.exaroton.me',
    port: 52424,
    username: 'BotAFK',
    version: '1.21.1'
  })

  bot.once('spawn', () => {
    console.log('✅ Bot connecté')
    setInterval(() => {
      bot.swingArm('right')
    }, 10000)
  })

  bot.on('kicked', r => console.log('❌ Kick:', r))
  bot.on('error', e => console.log('⚠️ Erreur:', e))

  bot.on('end', () => {
    console.log('🔄 Reconnexion dans 10s...')
    setTimeout(startBot, 10000)
  })
}

startBot()
