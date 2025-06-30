// ============================================================================
// SERVEUR LOCAL PAYS A (CÔTIER) - server.js
// Côte d'Ivoire - Système Douanier Côtier
// Compatible avec les APIs écrites pour Vercel
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration du serveur - PAYS A
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const PAYS_CODE = 'CIV';
const PAYS_NOM = 'Côte d\'Ivoire';
const PAYS_TYPE = 'COTIER';

console.log(`🏗️ Démarrage serveur ${PAYS_NOM} (${PAYS_TYPE})...`);

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

// Router pour les APIs PAYS A
const apiRouter = {
  'GET /api/health': () => require('./api/health'),
  'GET /api/statistiques': () => require('./api/statistiques'),
  'POST /api/manifeste/creer': () => require('./api/manifeste/creer'),
  'GET /api/manifeste/lister': () => require('./api/manifeste/lister'),
  'GET /api/mainlevee/autorisation': () => require('./api/mainlevee/autorisation'),
  'POST /api/mainlevee/autorisation': () => require('./api/mainlevee/autorisation'),
  'GET /api/kit/test': () => require('./api/kit/test'),
  'POST /api/kit/test': () => require('./api/kit/test')
};

// Fonction pour créer un objet de réponse compatible Vercel
function createVercelResponse(res) {
  const vercelRes = {
    headers: {},
    statusCode: 200,
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this.headers['Content-Type'] = 'application/json';
      res.writeHead(this.statusCode, this.headers);
      res.end(JSON.stringify(data));
      return this;
    },
    
    send: function(data) {
      this.headers['Content-Type'] = 'text/plain';
      res.writeHead(this.statusCode, this.headers);
      res.end(data);
      return this;
    },
    
    setHeader: function(name, value) {
      this.headers[name] = value;
      return this;
    },
    
    end: function(data) {
      res.writeHead(this.statusCode, this.headers);
      res.end(data);
      return this;
    }
  };
  
  return vercelRes;
}

// Fonction pour créer un objet de requête compatible Vercel
function createVercelRequest(req, body, query) {
  return {
    ...req,
    body: body || {},
    query: query || {},
    method: req.method,
    url: req.url,
    headers: req.headers
  };
}

// Serveur HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${pathname} - [${PAYS_CODE}]`);

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

    if (handler && pathname.startsWith('/api/')) {
      try {
        // Créer les objets compatibles Vercel
        const vercelRes = createVercelResponse(res);
        
        // Lire le body pour les requêtes POST
        let body = {};
        if (method === 'POST' || method === 'PUT') {
          body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => {
              data += chunk.toString();
            });
            
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (error) {
                console.error('Erreur parsing JSON:', error);
                resolve({});
              }
            });
            
            req.on('error', reject);
            
            // Timeout après 10 secondes
            setTimeout(() => resolve({}), 10000);
          });
        }
        
        const vercelReq = createVercelRequest(req, body, parsedUrl.query);
        
        // Exécuter le handler API
        const apiHandler = handler();
        await apiHandler(vercelReq, vercelRes);
        
      } catch (error) {
        console.error('❌ Erreur API:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal Server Error', 
          message: error.message,
          pays: PAYS_CODE
        }));
      }
      return;
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
          <head>
            <title>404 - Page Non Trouvée - ${PAYS_NOM}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              h1 { color: #e74c3c; }
              a { color: #3498db; text-decoration: none; }
              .container { background: rgba(255,255,255,0.9); padding: 40px; border-radius: 15px; color: #333; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🏗️ ${PAYS_NOM} (${PAYS_TYPE})</h1>
              <h2>404 - Page Non Trouvée</h2>
              <p>La page ${pathname} n'existe pas sur le système douanier de ${PAYS_NOM}.</p>
              <p><a href="/">← Retour au Dashboard ${PAYS_CODE}</a></p>
            </div>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error.message,
      pays: PAYS_CODE
    }));
  }
});

// Démarrer le serveur
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('🌊 ============================================================');
  console.log(`🏗️ Serveur ${PAYS_NOM} (${PAYS_TYPE}) démarré`);
  console.log(`🌍 URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Kit URL: https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io`);
  console.log(`⏹️  Arrêt: Ctrl+C`);
  console.log('🌊 ============================================================');
  console.log('');
  console.log(`🏗️ Simulateur ${PAYS_NOM} - Système Douanier Côtier`);
  console.log('📋 Fonctionnalités disponibles:');
  console.log('   • Création et transmission de manifestes');
  console.log('   • Réception d\'autorisations de mainlevée depuis Kit MuleSoft');
  console.log('   • Interface web interactive avec monitoring temps réel');
  console.log('   • Tests de connectivité Kit d\'Interconnexion');
  console.log(`   • Code pays: ${PAYS_CODE} | Type: ${PAYS_TYPE}`);
  console.log('');
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log(`\n🛑 Arrêt du serveur ${PAYS_NOM}...`);
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log(`\n🛑 Arrêt du serveur ${PAYS_NOM}...`);
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error(`❌ [${PAYS_CODE}] Erreur non capturée:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`❌ [${PAYS_CODE}] Promesse rejetée non gérée:`, reason);
});