const database = require('../lib/database');
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
      console.log('📊 [SÉNÉGAL] Demande statistiques - Port de Dakar');

      // ✅ Obtenir les statistiques locales Sénégal (priorité)
      const stats = database.obtenirStatistiques();
      console.log('✅ [SÉNÉGAL] Statistiques locales récupérées:', {
        manifestes: stats.manifestesCreees,
        transmissions: stats.transmissionsKit,
        apurements: stats.apurementsTraites,
        succès: stats.transmissionsReussies
      });
      
      // ✅ Test Kit MuleSoft en mode non-bloquant
      let kitInfo = null;
      try {
        console.log('🔍 [SÉNÉGAL] Test Kit MuleSoft rapide...');
        kitInfo = await Promise.race([
          kitClient.verifierSante(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Kit MuleSoft > 5s')), 5000)
          )
        ]);
        console.log('✅ [SÉNÉGAL] Kit MuleSoft accessible:', kitInfo.status);
      } catch (error) {
        console.log('⚠️ [SÉNÉGAL] Kit MuleSoft inaccessible (non bloquant):', error.message);
        kitInfo = { 
          accessible: false, 
          erreur: error.message,
          status: 'TIMEOUT_OU_INACCESSIBLE',
          source: 'DIRECT_MULESOFT_TEST'
        };
      }

      // Calculer des métriques avancées spécifiques Sénégal
      const metriques = calculerMetriquesSenegal(stats, database.obtenirInteractionsKit(10));

      // ✅ TOUJOURS retourner SUCCESS pour les statistiques locales Sénégal
      const reponse = {
        status: 'SUCCESS',
        message: 'Statistiques Sénégal (Port de Dakar) - Pays de prime abord',
        timestamp: new Date().toISOString(),
        
        // ✅ Informations Sénégal selon rapport PDF
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          type: 'COTIER',
          role: 'PAYS_PRIME_ABORD',
          port: 'Port de Dakar'
        },
        
        // Statistiques principales workflow Sénégal
        statistiques: {
          ...stats,
          performance: {
            tauxReussiteGlobal: metriques.tauxReussiteGlobal,
            latenceMoyenne: metriques.latenceMoyenne,
            volumeTraiteToday: stats.manifestesAujourdhui,
            tauxCompletionWorkflow: stats.workflow?.etape_19_mainlevee ? 
              Math.round((stats.workflow.etape_19_mainlevee / stats.manifestesCreees) * 100) : 0
          }
        },
        
        // ✅ Workflow libre pratique Sénégal (étapes 1-5, 17-19)
        workflowLibrePratique: {
          etapesSenegal: '1-5, 17-19',
          description: 'Création manifeste, transmission Kit, réception déclaration, apurement/levée',
          etapesCompletes: {
            'etapes_1_3_creation': stats.workflow?.etapes_1_3_creation || 0,
            'etape_4_5_transmission': stats.workflow?.etape_4_transmission || 0,
            'etape_17_declaration': stats.workflow?.etape_17_declaration || 0,
            'etape_18_apurement': stats.workflow?.etape_18_apurement || 0,
            'etape_19_mainlevee': stats.workflow?.etape_19_mainlevee || 0
          },
          prochaine_attente: 'Traitement pays de destination (étapes 6-16)'
        },
        
        // ✅ Statut Kit séparé des statistiques principales
        kit: {
          status: kitInfo?.status || 'UNKNOWN',
          accessible: kitInfo?.accessible || false,
          url: kitClient.baseURL,
          latence: kitInfo?.latence || null,
          dernierTest: kitInfo?.timestamp || new Date().toISOString(),
          modeConnexion: 'DIRECT_MULESOFT',
          source: kitInfo?.source || 'DIRECT_MULESOFT_TEST',
          connectivity: kitInfo?.accessible ? 'CONNECTED' : 'DISCONNECTED',
          role: 'Transmission extraction vers pays de destination'
        },
        
        // Interactions récentes spécifiques Sénégal
        interactionsRecentes: database.obtenirInteractionsKit(5).map(interaction => ({
          id: interaction.id,
          type: interaction.type,
          timestamp: interaction.timestamp,
          etapeWorkflow: interaction.etapeWorkflow,
          paysCode: interaction.paysCode,
          description: interaction.description
        })),
        
        // ✅ Opérations par type selon workflow Sénégal
        operationsParType: {
          manifestesCreees: stats.manifestesCreees,
          transmissionsKit: stats.transmissionsKit,
          declarationsRecues: stats.autorisationsRecues,
          apurementsTraites: stats.apurementsTraites,
          transitsCrees: stats.transitsCrees,
          erreursTransmission: stats.erreurs
        },
        
        // Tendances workflow
        tendances: metriques.tendances,
        
        // ✅ Santé système Sénégal
        systemeSante: {
          servicePrincipal: 'UP',
          baseDonnees: 'UP',
          kitInterconnexion: kitInfo?.accessible ? 'UP' : 'DOWN',
          modeIntegration: 'DIRECT_MULESOFT',
          urlKit: kitClient.baseURL,
          derniereMiseAJour: stats.derniereMiseAJour,
          fonctionnalitesAffectees: kitInfo?.accessible ? [] : ['Transmission temps réel vers pays destination']
        },
        
        // ✅ Partenaires workflow selon rapport PDF
        partenaires: {
          kit_interconnexion: {
            url: kitClient.baseURL,
            role: 'Routage vers pays de destination',
            disponible: kitInfo?.accessible || false
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
        }
      };

      // ✅ TOUJOURS 200 OK pour les statistiques locales
      res.status(200).json(reponse);
      
      console.log('📊 [SÉNÉGAL] Statistiques envoyées - Kit status:', kitInfo?.accessible ? 'OK' : 'KO');
      
    } catch (error) {
      console.error('❌ [SÉNÉGAL] Erreur récupération statistiques:', error);
      
      // ✅ Même en cas d'erreur, essayer de retourner les stats de base
      try {
        const statsBasiques = database.obtenirStatistiques();
        res.status(200).json({
          status: 'PARTIAL',
          message: 'Statistiques partielles Sénégal disponibles',
          paysTraitement: {
            code: 'SEN',
            nom: 'Sénégal',
            port: 'Port de Dakar'
          },
          statistiques: statsBasiques,
          erreur: error.message,
          timestamp: new Date().toISOString()
        });
      } catch (fatalError) {
        res.status(500).json({
          status: 'ERROR',
          message: 'Erreur fatale statistiques Sénégal',
          paysTraitement: {
            code: 'SEN',
            nom: 'Sénégal',
            port: 'Port de Dakar'
          },
          erreur: fatalError.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else {
    res.status(405).json({ 
      erreur: 'Méthode non autorisée',
      methodesAutorisees: ['GET', 'OPTIONS'],
      paysTraitement: 'Sénégal - Port de Dakar'
    });
  }
};