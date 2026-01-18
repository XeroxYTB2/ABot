const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'minecraft-afk-bot'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Minecraft AFK Bot is running');
  }
});

server.listen(PORT, () => {
  console.log(`✅ Healthcheck server running on port ${PORT}`);
});

module.exports = server;
