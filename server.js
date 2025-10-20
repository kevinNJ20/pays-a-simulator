// ============================================================================
// SERVEUR LOCAL SÉNÉGAL - server.js COMPLET AVEC HTTPS
// Port de Dakar - Pays de prime abord
// Compatible avec les APIs écrites pour Vercel selon rapport PDF UEMOA
// ============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ✅ Configuration du serveur - SÉNÉGAL (PAYS A selon rapport PDF)
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HOST = '0.0.0.0';
const PAYS_CODE = 'SEN'; // Sénégal
const PAYS_NOM = 'Sénégal';
const PAYS_TYPE = 'COTIER'; // Pays côtier selon rapport PDF
const PAYS_ROLE = 'PAYS_PRIME_ABORD'; // Rôle selon rapport PDF
const PORT_NAME = 'Port de Dakar'; // Port principal Sénégal

// Vérifier si les certificats SSL existent
const USE_HTTPS = process.env.USE_HTTPS === 'true' || fs.existsSync(path.join(__dirname, 'ssl-certs', 'cert.pem'));

console.log(`🇸🇳 Démarrage serveur ${PAYS_NOM} (${PAYS_TYPE}) - ${PAYS_ROLE}...`);
if (USE_HTTPS) {
  console.log('🔐 Mode HTTPS activé');
}

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
  
  // ✅ WORKFLOW TRANSIT
  // ÉTAPES 1-6 : Création déclaration transit
  'POST /api/transit/creer': () => require('./api/transit/creer'),
  'GET /api/transit/lister': () => require('./api/transit/lister'),
  
  // ÉTAPE 14 : Réception message arrivée
  'POST /api/transit/arrivee': () => require('./api/transit/arrivee'),

  // ✅ APIs Authentification
  'POST /api/auth/login': () => require('./api/auth/login'),
  'POST /api/auth/verify': () => require('./api/auth/verify'),
  'GET /api/auth/verify': () => require('./api/auth/verify'),
  'POST /api/auth/logout': () => require('./api/auth/logout'),
  
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

// ✅ Fonction de gestion des requêtes (utilisée par HTTP et HTTPS)
const requestHandler = async (req, res) => {
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
};

// ✅ Créer le serveur HTTP (redirige vers HTTPS si activé)
const httpServer = http.createServer((req, res) => {
  if (USE_HTTPS) {
    // Redirection automatique vers HTTPS
    const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
    const redirectUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
    
    console.log(`🔀 Redirection HTTP → HTTPS: ${req.url}`);
    res.writeHead(301, { 'Location': redirectUrl });
    res.end();
  } else {
    // Mode HTTP normal
    requestHandler(req, res);
  }
});

// ✅ Créer le serveur HTTPS si certificats disponibles
let httpsServer = null;
if (USE_HTTPS) {
  try {
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, 'ssl-certs', 'key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'ssl-certs', 'cert.pem'))
    };
    
    httpsServer = https.createServer(sslOptions, requestHandler);
    console.log('🔐 Certificats SSL chargés avec succès');
  } catch (error) {
    console.error('❌ Erreur chargement certificats SSL:', error.message);
    console.log('⚠️ Le serveur fonctionnera en HTTP uniquement');
    console.log('💡 Pour activer HTTPS, exécutez: ./generate-ssl.sh');
  }
}

// ✅ Démarrer le serveur HTTP
httpServer.listen(HTTP_PORT, HOST, () => {
  console.log('');
  console.log('🇸🇳 ═══════════════════════════════════════════════════════════');
  console.log(`🇸🇳 Serveur ${PAYS_NOM} (${PAYS_ROLE}) démarré`);
  console.log(`🌍 HTTP: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${HTTP_PORT}`);
  
  if (USE_HTTPS) {
    console.log(`   → Redirige automatiquement vers HTTPS`);
  } else {
    console.log(`📊 Dashboard: http://64.225.5.75:${HTTP_PORT}`);
    console.log(`📊 Dashboard local: http://localhost:${HTTP_PORT}`);
  }
  
  console.log('🇸🇳 ═══════════════════════════════════════════════════════════');
  console.log('');
});

// ✅ Démarrer le serveur HTTPS si disponible
if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, HOST, () => {
    console.log('🔐 ═══════════════════════════════════════════════════════════');
    console.log(`🔐 Serveur HTTPS ${PAYS_NOM} prêt sur le port ${HTTPS_PORT}`);
    console.log(`🌍 HTTPS: https://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${HTTPS_PORT}`);
    console.log(`📊 Dashboard: https://64.225.5.75:${HTTPS_PORT}`);
    console.log(`📊 Dashboard local: https://localhost:${HTTPS_PORT}`);
    console.log(`🔍 Health: https://localhost:${HTTPS_PORT}/api/health`);
    console.log(`🔗 Kit MuleSoft: http://64.225.5.75:8086/api/v1`);
    console.log('🔐 ═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT - Certificat Auto-Signé:');
    console.log('   • Le navigateur affichera un avertissement de sécurité');
    console.log('   • Chrome/Edge: Cliquez "Avancé" puis "Continuer vers le site"');
    console.log('   • Firefox: Cliquez "Accepter le risque et continuer"');
    console.log('');
    console.log('💡 Pour un certificat valide sans avertissement:');
    console.log('   • Obtenez un nom de domaine gratuit (DuckDNS, No-IP)');
    console.log('   • Utilisez Let\'s Encrypt avec Certbot');
    console.log('   • Consultez HTTPS_GUIDE.md pour les instructions');
    console.log('');
    console.log('⏹️  Arrêt: Ctrl+C');
    console.log('');
  });
}

// Afficher les informations du système
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
if (USE_HTTPS) {
  console.log('   • 🔐 HTTPS activé avec certificat SSL');
}
console.log('');
console.log(`   📍 LOCALISATION: ${PORT_NAME} | Code: ${PAYS_CODE} | Type: ${PAYS_TYPE}`);
console.log('   🎯 DESTINATIONS: Mali, Burkina Faso, Niger, Côte d\'Ivoire, etc.');
console.log('');

// ✅ Gestion propre de l'arrêt
const shutdown = () => {
  console.log(`\n🛑 Arrêt du serveur ${PAYS_NOM} (${PORT_NAME})...`);
  
  httpServer.close(() => {
    console.log(`✅ Serveur HTTP ${PAYS_NOM} arrêté`);
    
    if (httpsServer) {
      httpsServer.close(() => {
        console.log(`✅ Serveur HTTPS ${PAYS_NOM} arrêté`);
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force l'arrêt après 10 secondes
  setTimeout(() => {
    console.error('⚠️ Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ✅ Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error(`❌ [${PAYS_CODE}] Erreur non capturée:`, error);
  console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`❌ [${PAYS_CODE}] Promesse rejetée non gérée:`, reason);
  console.error('Promise:', promise);
});