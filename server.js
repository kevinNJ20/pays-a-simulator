// ============================================================================
// SERVEUR LOCAL SIMPLE - server.js
// Créer ce fichier dans CHAQUE simulateur (pays-a, pays-b, commission)
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration du serveur
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Types MIME
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

// Router pour les APIs
const apiRouter = {
  'GET /api/health': () => require('./api/health'),
  'GET /api/statistiques': () => require('./api/statistiques'),
  'POST /api/manifeste/creer': () => require('./api/manifeste/creer'),
  'GET /api/manifeste/lister': () => require('./api/manifeste/lister'),
  'POST /api/paiement/effectuer': () => require('./api/paiement/effectuer'),
  'GET /api/mainlevee/autorisation': () => require('./api/mainlevee/autorisation'),
  'POST /api/mainlevee/autorisation': () => require('./api/mainlevee/autorisation')
};

// Serveur HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${pathname}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Source-Country, X-Source-System, X-Correlation-ID, X-Authorization-Source');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Router API
    const route = `${method} ${pathname}`;
    if (apiRouter[route] || pathname.startsWith('/api/')) {
      let handler = apiRouter[route];
      
      // Si pas de route exacte, essayer de trouver une route partielle
      if (!handler) {
        for (const [routePattern, routeHandler] of Object.entries(apiRouter)) {
          const [routeMethod, routePath] = routePattern.split(' ');
          if (routeMethod === method && pathname.startsWith(routePath)) {
            handler = routeHandler;
            break;
          }
        }
      }

      if (handler) {
        // Lire le body pour les requêtes POST
        let body = '';
        if (method === 'POST' || method === 'PUT') {
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};
              req.query = parsedUrl.query;
              
              const apiHandler = handler();
              await apiHandler(req, res);
            } catch (error) {
              console.error('Erreur API:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Internal Server Error', 
                message: error.message 
              }));
            }
          });
        } else {
          req.query = parsedUrl.query;
          const apiHandler = handler();
          await apiHandler(req, res);
        }
        return;
      }
    }

    // Servir les fichiers statiques
    let filePath;
    if (pathname === '/') {
      filePath = path.join(__dirname, 'public', 'index.html');
    } else {
      filePath = path.join(__dirname, 'public', pathname);
    }

    // Vérifier si le fichier existe
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': mimeType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // 404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>404 - Page Non Trouvée</h1>
            <p>La page ${pathname} n'existe pas.</p>
            <p><a href="/">Retour à l'accueil</a></p>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error.message 
    }));
  }
});

// Démarrer le serveur
server.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur démarré sur http://${HOST}:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`⏹️  Arrêt: Ctrl+C`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});