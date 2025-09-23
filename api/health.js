// ============================================================================
// SÉNÉGAL - API Health CORRIGÉE selon rapport PDF UEMOA
// Port de Dakar - Pays de prime abord  
// ============================================================================

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
      console.log('🏥 [SÉNÉGAL] Demande health check - Port de Dakar');
      
      // Test connectivité Kit MuleSoft
      let kitStatus = null;
      try {
        console.log('🔍 [SÉNÉGAL] Test connectivité Kit MuleSoft...');
        
        kitStatus = await Promise.race([
          kitClient.verifierSante(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Kit MuleSoft > 8s')), 8000)
          )
        ]);
        
        console.log('✅ [SÉNÉGAL] Kit MuleSoft accessible:', kitStatus.accessible);
        
      } catch (error) {
        console.error('❌ [SÉNÉGAL] Kit MuleSoft inaccessible:', error.message);
        kitStatus = {
          accessible: false,
          erreur: error.message,
          status: 'TIMEOUT_OU_INACCESSIBLE',
          timestamp: new Date(),
          source: 'DIRECT_MULESOFT_TEST'
        };
      }

      const healthStatus = {
        service: 'Système Douanier Sénégal (Port de Dakar)',
        status: 'UP',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        
        // ✅ CORRECTION: Informations Sénégal conformes au rapport PDF
        pays: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          type: 'COTIER',
          role: 'PAYS_PRIME_ABORD'
        },
        
        port: {
          nom: 'Port de Dakar',
          type: 'PORT_COMMERCIAL',
          capacite: 'INTERNATIONAL',
          fonction: 'DEBARQUEMENT_MARCHANDISES'
        },
        
        fonctionnalites: {
          creationManifeste: 'ACTIF', // Étapes 1-3
          transmissionKit: kitStatus?.accessible ? 'ACTIF' : 'INDISPONIBLE', // Étapes 4-5
          receptionDeclaration: 'ACTIF', // Étape 17
          apurementMainlevee: 'ACTIF' // Étapes 18-19
        },
        
        workflow: {
          libre_pratique: {
            etapes_senegal: '1-5, 17-19',
            description: 'Création manifeste, transmission Kit, réception déclaration, apurement/levée',
            prochaine_attente: 'Traitement pays de destination (étapes 6-16)'
          },
          transit: {
            etapes_senegal: '1-6, 14-19',
            description: 'Transit ordinaire dans le cadre libre pratique'
          }
        },
        
        // Kit d'Interconnexion
        kit: {
          url: kitClient.baseURL,
          status: kitStatus?.status || 'UNKNOWN',
          accessible: kitStatus?.accessible || false,
          latence: kitStatus?.latence || null,
          dernierTest: kitStatus?.timestamp || new Date().toISOString(),
          modeConnexion: 'DIRECT_MULESOFT',
          source: kitStatus?.source || 'UNKNOWN',
          role: 'Transmission extraction vers pays de destination'
        },
        
        endpoints: {
          health: '/api/health',
          statistiques: '/api/statistiques',
          creerManifeste: '/api/manifeste/creer', // Étapes 1-5
          listerManifestes: '/api/manifeste/lister',
          autorisationMainlevee: '/api/mainlevee/autorisation', // Étape 17
          apurementTraiter: '/api/apurement/traiter' // Étapes 18-19
        },
        
        // Partenaires workflow
        partenaires: {
          kit_interconnexion: {
            url: kitClient.baseURL,
            role: 'Routage vers pays de destination',
            disponible: kitStatus?.accessible || false
          },
          pays_destination: {
            exemple: 'Mali (Bamako)',
            role: 'Traitement déclaration libre pratique (étapes 6-16)',
            communication: 'Via Kit MuleSoft'
          },
          commission_uemoa: {
            role: 'Supervision et statistiques workflow',
            communication: 'Transmission batch périodique (étape 21)'
          }
        },
        
        monitoring: {
          uptime: process.uptime(),
          memoire: process.memoryUsage(),
          environnement: process.env.NODE_ENV || 'development'
        }
      };

      // Status global du service
      const globalStatus = kitStatus?.accessible ? 'UP' : 'DEGRADED';
      
      res.status(200).json({
        ...healthStatus,
        status: globalStatus
      });
      
      console.log(`✅ [SÉNÉGAL] Health check envoyé - Service: ${globalStatus} - Kit: ${kitStatus?.accessible ? 'OK' : 'KO'}`);
      
    } catch (error) {
      console.error('❌ [SÉNÉGAL] Erreur health check:', error);
      
      res.status(500).json({
        service: 'Système Douanier Sénégal (Port de Dakar)',
        status: 'ERROR',
        erreur: error.message,
        pays: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar'
        },
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(405).json({ 
      erreur: 'Méthode non autorisée',
      methodesAutorisees: ['GET', 'OPTIONS'],
      pays: 'Sénégal - Port de Dakar'
    });
  }
};