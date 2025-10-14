// ============================================================================
// SERVEUR LOCAL SÉNÉGAL - server.js CORRIGÉ
// Port de Dakar - Pays de prime abord
// Compatible avec les APIs écrites pour Vercel selon rapport PDF UEMOA
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ✅ Configuration du serveur - SÉNÉGAL (PAYS A selon rapport PDF)
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const PAYS_CODE = 'SEN'; // ✅ CORRECTION: Sénégal au lieu de CIV
const PAYS_NOM = 'Sénégal';
const PAYS_TYPE = 'COTIER'; // ✅ Pays côtier selon rapport PDF
const PAYS_ROLE = 'PAYS_PRIME_ABORD'; // ✅ Rôle selon rapport PDF
const PORT_NAME = 'Port de Dakar'; // ✅ Port principal Sénégal

console.log(`🇸🇳 Démarrage serveur ${PAYS_NOM} (${PAYS_TYPE}) - ${PAYS_ROLE}...`);

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

// ✅ Router pour les APIs SÉNÉGAL - Workflow libre pratique
const apiRouter = {
  // ✅ APIs principales Sénégal
  'GET /api/health': () => require('./api/health'),
  'GET /api/statistiques': () => require('./api/statistiques'),
  
  // ✅ ÉTAPES 1-5 : Création et transmission manifeste
  'POST /api/manifeste/creer': () => require('./api/manifeste/creer'),
  'GET /api/manifeste/lister': () => require('./api/manifeste/lister'),
  
  // ✅ ÉTAPE 17 : Réception informations déclaration/recouvrement
  'GET /api/mainlevee/autorisation': () => require('./api/mainlevee/autorisation'),
  'POST /api/mainlevee/autorisation': () => require('./api/mainlevee/autorisation'),
  
  // ✅ ÉTAPES 18-19 : Apurement et levée des marchandises
  'GET /api/apurement/traiter': () => require('./api/apurement/traiter'),
  'POST /api/apurement/traiter': () => require('./api/apurement/traiter'),
  
  // ✅ Tests Kit MuleSoft
  'GET /api/kit/test': () => require('./api/kit/test'),
  'POST /api/kit/test': () => require('./api/kit/test'),

  //✅ WORKFLOW TRANSIT
  // ÉTAPES 1-6 : Création déclaration transit
  'POST /api/transit/creer': () => require('./api/transit/creer'),
  'GET /api/transit/lister': () => require('./api/transit/lister'),
  
  // ÉTAPE 14 : Réception message arrivée
  'POST /api/transit/arrivee': () => require('./api/transit/arrivee'),
  
  // ✅ Tests Kit MuleSoft
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

// ✅ Serveur HTTP Sénégal
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${pathname} - [${PAYS_CODE}] ${PORT_NAME}`);

  // ✅ CORS headers pour interconnexion UEMOA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Source-Country, X-Source-System, X-Correlation-ID, X-Authorization-Source, X-Payment-Reference');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // ✅ Router API avec routes spécifiques Sénégal
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
                console.error(`❌ [${PAYS_CODE}] Erreur parsing JSON:`, error);
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
        console.error(`❌ [${PAYS_CODE}] Erreur API:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal Server Error', 
          message: error.message,
          pays: PAYS_CODE,
          port: PORT_NAME
        }));
      }
      return;
    }

    // ✅ Servir les fichiers statiques
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
      // ✅ 404 personnalisé Sénégal
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
                background: linear-gradient(135deg, #00a651 0%, #ff0000 50%, #ffcc00 100%);
                color: white;
              }
              h1 { color: #e74c3c; }
              a { color: #3498db; text-decoration: none; }
              .container { 
                background: rgba(255,255,255,0.9); 
                padding: 40px; 
                border-radius: 15px; 
                color: #333; 
                display: inline-block; 
                max-width: 600px;
                margin: 0 auto;
              }
              .flag { font-size: 3em; margin-bottom: 20px; }
              .info { margin: 15px 0; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="flag">🇸🇳</div>
              <h1>${PAYS_NOM} - ${PORT_NAME}</h1>
              <h2>404 - Page Non Trouvée</h2>
              <p>La page ${pathname} n'existe pas sur le système douanier du ${PAYS_NOM}.</p>
              <div class="info">
                <strong>Rôle:</strong> ${PAYS_ROLE}<br>
                <strong>Type:</strong> ${PAYS_TYPE}<br>
                <strong>Port:</strong> ${PORT_NAME}<br>
                <strong>Code pays:</strong> ${PAYS_CODE}
              </div>
              <p><a href="/">← Retour au Dashboard ${PAYS_NOM}</a></p>
            </div>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error(`❌ [${PAYS_CODE}] Erreur serveur:`, error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error.message,
      pays: PAYS_CODE,
      port: PORT_NAME
    }));
  }
});

// ✅ Démarrer le serveur Sénégal
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('🇸🇳 ═══════════════════════════════════════════════════════════');
  console.log(`🇸🇳 Serveur ${PAYS_NOM} (${PAYS_ROLE}) démarré`);
  console.log(`🌍 URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Kit MuleSoft: http://localhost:8080/api/v1`);
  console.log(`⏹️  Arrêt: Ctrl+C`);
  console.log('🇸🇳 ═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`🇸🇳 Simulateur ${PAYS_NOM} - Système Douanier ${PAYS_ROLE}`);
  console.log('📋 Fonctionnalités disponibles conformes au rapport PDF UEMOA:');
  console.log('');
  console.log('   🔥 WORKFLOW LIBRE PRATIQUE (21 étapes):');
  console.log('   • ÉTAPES 1-3: Création et enregistrement manifeste');
  console.log('   • ÉTAPES 4-5: Transmission extraction vers Kit MuleSoft');
  console.log('   • ÉTAPE 17: Réception informations déclaration/recouvrement');
  console.log('   • ÉTAPE 18: Apurement du manifeste');
  console.log('   • ÉTAPE 19: Attribution main levée (bon à enlever)');
  console.log('');
  console.log('   🚛 WORKFLOW TRANSIT (16 étapes):');
  console.log('   • ÉTAPES 1-6: Création déclaration transit au départ');
  console.log('   • ÉTAPE 14: Réception message arrivée destination');
  console.log('   • ÉTAPES 15-16: Apurement transit');
  console.log('');
  console.log('   🔧 OUTILS TECHNIQUES:');
  console.log('   • Interface web interactive avec monitoring temps réel');
  console.log('   • Tests de connectivité Kit d\'Interconnexion MuleSoft');
  console.log('   • Format UEMOA natif pour manifestes et déclarations');
  console.log('');
  console.log(`   📍 LOCALISATION: ${PORT_NAME} | Code: ${PAYS_CODE} | Type: ${PAYS_TYPE}`);
  console.log('   🎯 DESTINATIONS: Mali, Burkina Faso, Niger, Côte d\'Ivoire, etc.');
  console.log('');
  console.log('   📋 ÉTAPES PAYS A SIMULÉES:');
  console.log('   ✅ Création manifeste → Transmission Kit → Réception déclaration → Apurement/Levée');
  console.log('   ⏳ PROCHAINES CORRECTIONS: Pays B (Mali), Kit MuleSoft, Commission UEMOA');
  console.log('');
});

// ✅ Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log(`\n🛑 Arrêt du serveur ${PAYS_NOM} (${PORT_NAME})...`);
  server.close(() => {
    console.log(`✅ Serveur ${PAYS_NOM} arrêté proprement`);
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log(`\n🛑 Arrêt du serveur ${PAYS_NOM} (${PORT_NAME})...`);
  server.close(() => {
    console.log(`✅ Serveur ${PAYS_NOM} arrêté proprement`);
    process.exit(0);
  });
});

// ✅ Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error(`❌ [${PAYS_CODE}] Erreur non capturée:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`❌ [${PAYS_CODE}] Promesse rejetée non gérée:`, reason);
});