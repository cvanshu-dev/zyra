// server.js
const { createServer } = require('https');
const fs = require('fs');
const next = require('next');
const { parse } = require('url');

const port = parseInt(process.env.PORT || '3001', 10);
const hostname = process.env.HOST || '0.0.0.0'; // bind to network

const app = next({ dev: true, hostname: '10.48.85.128', port }); // dev mode
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost.pem'),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://10.48.85.128:${port}`);

  });
});
