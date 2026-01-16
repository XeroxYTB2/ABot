const mineflayer = require('mineflayer')

function startBot () {
  const bot = mineflayer.createBot({
    host: 'IP_DU_SERVEUR',
    port: 25565,
    username: 'BotAFK',
    version: '1.20.1'
  })

  bot.once('spawn', () => {
    console.log('✅ Bot connecté')
    setInterval(() => bot.swingArm('right'), 10000)
  })

  bot.on('end', () => {
    console.log('🔄 Reconnexion...')
    setTimeout(startBot, 5000)
  })

  bot.on('kicked', r => console.log('❌ Kick:', r))
  bot.on('error', e => console.log('⚠️ Erreur:', e))
}

startBot()
