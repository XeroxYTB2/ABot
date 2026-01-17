const mineflayer = require('mineflayer')

function startBot () {
  const bot = mineflayer.createBot({
    host: 'TheOnly.exaroton.me',
    port: 52424,
    username: 'PierrePaul',
    version: '1.21.1'
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
