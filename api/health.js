const kitClient = require('../lib/kit-client');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // ✅ CORRECTION: Tester la connectivité DIRECTE vers MuleSoft
      let kitStatus = null;
      try {
        console.log('🔍 [Pays A] Test connectivité DIRECTE vers Kit MuleSoft...');
        
        kitStatus = await Promise.race([
          kitClient.verifierSante(), // ✅ Maintenant va directement vers MuleSoft
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Kit MuleSoft > 8s')), 8000)
          )
        ]);
        
        console.log('✅ [Pays A] Kit MuleSoft accessible:', kitStatus.accessible);
        
      } catch (error) {
        console.error('❌ [Pays A] Kit MuleSoft inaccessible:', error.message);
        kitStatus = {
          accessible: false,
          erreur: error.message,
          status: 'TIMEOUT_OU_INACCESSIBLE',
          timestamp: new Date(),
          source: 'DIRECT_MULESOFT_TEST'
        };
      }

      const healthStatus = {
        service: 'Système Douanier Pays A (Côtier)',
        status: 'UP',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        
        pays: {
          code: 'CIV',
          nom: 'Côte d\'Ivoire',
          type: 'COTIER',
          role: 'PAYS_PRIME_ABORD'
        },
        
        fonctionnalites: {
          creationManifeste: 'ACTIF',
          transmissionKit: kitStatus?.accessible ? 'ACTIF' : 'INDISPONIBLE',
          receptionMainlevee: 'ACTIF'
        },
        
        // ✅ CORRECTION: Informations Kit MuleSoft directes
        kit: {
          url: kitClient.baseURL, // URL MuleSoft directe
          status: kitStatus?.status || 'UNKNOWN',
          accessible: kitStatus?.accessible || false,
          latence: kitStatus?.latence || null,
          dernierTest: kitStatus?.timestamp || new Date().toISOString(),
          modeConnexion: 'DIRECT_MULESOFT',
          source: kitStatus?.source || 'UNKNOWN'
        },
        
        endpoints: {
          health: '/api/health',
          statistiques: '/api/statistiques',
          creerManifeste: '/api/manifeste/creer',
          listerManifestes: '/api/manifeste/lister',
          autorisationMainlevee: '/api/mainlevee/autorisation'
        },
        
        monitoring: {
          uptime: process.uptime(),
          memoire: process.memoryUsage(),
          environnement: process.env.NODE_ENV || 'development'
        }
      };

      // ✅ Status global du service (DEGRADED si Kit inaccessible)
      const globalStatus = kitStatus?.accessible ? 'UP' : 'DEGRADED';
      
      res.status(200).json({
        ...healthStatus,
        status: globalStatus
      });
      
    } catch (error) {
      console.error('❌ [Pays A] Erreur health check:', error);
      
      res.status(500).json({
        service: 'Système Douanier Pays A (Côtier)',
        status: 'ERROR',
        erreur: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(405).json({ 
      erreur: 'Méthode non autorisée',
      methodesAutorisees: ['GET', 'OPTIONS']
    });
  }
};