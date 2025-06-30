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
      console.log('📊 [Pays A] Demande statistiques');

      // Obtenir les statistiques de base
      const stats = database.obtenirStatistiques();
      const interactions = database.obtenirInteractionsKit(10);
      
      // ✅ CORRECTION: Test Kit direct vers MuleSoft (sans bloquer)
      let kitInfo = null;
      try {
        console.log('🔍 [Pays A] Test Kit MuleSoft direct...');
        kitInfo = await Promise.race([
          kitClient.verifierSante(), // ✅ Va maintenant directement vers MuleSoft
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Kit MuleSoft > 5s')), 5000)
          )
        ]);
        console.log('✅ [Pays A] Kit MuleSoft status:', kitInfo.status);
      } catch (error) {
        console.error('❌ [Pays A] Kit MuleSoft inaccessible:', error.message);
        kitInfo = { 
          accessible: false, 
          erreur: error.message,
          status: 'TIMEOUT_OU_INACCESSIBLE',
          source: 'DIRECT_MULESOFT_TEST'
        };
      }

      // Calculer des métriques avancées
      const metriques = calculerMetriques(stats, interactions);

      const reponse = {
        status: 'SUCCESS',
        message: 'Statistiques Pays A (Côtier)',
        timestamp: new Date().toISOString(),
        
        // Statistiques principales
        statistiques: {
          ...stats,
          performance: {
            tauxReussiteGlobal: metriques.tauxReussiteGlobal,
            latenceMoyenne: metriques.latenceMoyenne,
            volumeTraiteToday: stats.manifestesAujourdhui
          }
        },
        
        // ✅ CORRECTION: Informations Kit MuleSoft directes
        kit: {
          status: kitInfo?.status || 'UNKNOWN',
          accessible: kitInfo?.accessible || false,
          url: kitClient.baseURL, // URL MuleSoft directe
          latence: kitInfo?.latence || null,
          dernierTest: kitInfo?.timestamp || new Date().toISOString(),
          modeConnexion: 'DIRECT_MULESOFT', // ✅ Indique connexion directe
          source: kitInfo?.source || 'DIRECT_MULESOFT_TEST'
        },
        
        // Interactions récentes avec le Kit
        interactionsRecentes: interactions.map(interaction => ({
          id: interaction.id,
          type: interaction.type,
          timestamp: interaction.timestamp,
          statut: interaction.donnees?.statut,
          details: interaction.donnees?.manifesteId || interaction.donnees?.autorisationId
        })),
        
        // Breakdown par type d'opération
        operationsParType: {
          manifestesCreees: stats.manifestesCreees,
          transmissionsKit: stats.transmissionsKit,
          autorisationsRecues: stats.autorisationsRecues,
          erreursTransmission: stats.erreurs
        },
        
        // Données pour graphiques
        tendances: metriques.tendances,
        
        // ✅ CORRECTION: Santé du système avec info Kit directe
        systemeSante: {
          servicePrincipal: 'UP',
          baseDonnees: 'UP',
          kitInterconnexion: kitInfo?.accessible ? 'UP' : 'DOWN',
          modeIntegration: 'DIRECT_MULESOFT', // ✅ Nouveau champ
          urlKit: kitClient.baseURL, // ✅ URL directe MuleSoft
          derniereMiseAJour: stats.derniereMiseAJour
        }
      };

      // ✅ Status global (DEGRADED si Kit inaccessible mais service fonctionne)
      const globalStatus = kitInfo?.accessible ? 'UP' : 'DEGRADED';
      
      res.status(200).json({
        ...reponse,
        status: globalStatus
      });
      
    } catch (error) {
      console.error('❌ [Pays A] Erreur récupération statistiques:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur lors de la récupération des statistiques',
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

// Fonction pour calculer des métriques avancées (inchangée)
function calculerMetriques(stats, interactions) {
  // Taux de réussite global
  const tauxReussiteGlobal = stats.transmissionsKit > 0 
    ? Math.round(((stats.transmissionsKit - stats.erreurs) / stats.transmissionsKit) * 100)
    : 100;

  // Latence moyenne des interactions réussies
  const interactionsAvecLatence = interactions
    .filter(i => i.donnees?.details?.latence)
    .map(i => i.donnees.details.latence);
  
  const latenceMoyenne = interactionsAvecLatence.length > 0
    ? Math.round(interactionsAvecLatence.reduce((a, b) => a + b, 0) / interactionsAvecLatence.length)
    : 0;

  // Tendances (basé sur les interactions des dernières heures)
  const maintenant = new Date();
  const deuxHeuresAgo = new Date(maintenant.getTime() - (2 * 60 * 60 * 1000));
  
  const interactionsRecentes = interactions
    .filter(i => new Date(i.timestamp) >= deuxHeuresAgo);
  
  const tendances = {
    interactionsDernieres2h: interactionsRecentes.length,
    erreursDernieres2h: interactionsRecentes.filter(i => i.donnees?.statut === 'ERREUR').length,
    evolutionVolume: interactionsRecentes.length > 0 ? 'STABLE' : 'FAIBLE'
  };

  return {
    tauxReussiteGlobal,
    latenceMoyenne,
    tendances
  };
}