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

      // ✅ CORRECTION 1: Obtenir les statistiques locales TOUJOURS (priorité)
      const stats = database.obtenirStatistiques();
      console.log('✅ [Pays A] Statistiques locales récupérées:', {
        manifestes: stats.manifestesCreees,
        transmissions: stats.transmissionsKit,
        succès: stats.transmissionsReussies
      });
      
      // ✅ CORRECTION 2: Test Kit en mode non-bloquant et plus rapide
      let kitInfo = null;
      try {
        console.log('🔍 [Pays A] Test Kit MuleSoft rapide...');
        kitInfo = await Promise.race([
          kitClient.verifierSante(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Kit MuleSoft > 3s')), 3000) // ✅ Réduit à 3s
          )
        ]);
        console.log('✅ [Pays A] Kit MuleSoft accessible:', kitInfo.status);
      } catch (error) {
        console.log('⚠️ [Pays A] Kit MuleSoft inaccessible (non bloquant):', error.message);
        kitInfo = { 
          accessible: false, 
          erreur: error.message,
          status: 'TIMEOUT_OU_INACCESSIBLE',
          source: 'DIRECT_MULESOFT_TEST'
        };
      }

      // Calculer des métriques avancées
      const metriques = calculerMetriques(stats, database.obtenirInteractionsKit(10));

      // ✅ CORRECTION 3: TOUJOURS retourner SUCCESS pour les statistiques locales
      const reponse = {
        status: 'SUCCESS', // ✅ TOUJOURS SUCCESS - Kit status séparé
        message: 'Statistiques Pays A (Côtier)',
        timestamp: new Date().toISOString(),
        
        // Statistiques principales (TOUJOURS disponibles)
        statistiques: {
          ...stats,
          performance: {
            tauxReussiteGlobal: metriques.tauxReussiteGlobal,
            latenceMoyenne: metriques.latenceMoyenne,
            volumeTraiteToday: stats.manifestesAujourdhui
          }
        },
        
        // ✅ CORRECTION 4: Statut Kit séparé des statistiques principales
        kit: {
          status: kitInfo?.status || 'UNKNOWN',
          accessible: kitInfo?.accessible || false,
          url: kitClient.baseURL,
          latence: kitInfo?.latence || null,
          dernierTest: kitInfo?.timestamp || new Date().toISOString(),
          modeConnexion: 'DIRECT_MULESOFT',
          source: kitInfo?.source || 'DIRECT_MULESOFT_TEST',
          // ✅ NOUVEAU: Statut séparé pour UI
          connectivity: kitInfo?.accessible ? 'CONNECTED' : 'DISCONNECTED'
        },
        
        // Interactions récentes avec le Kit
        interactionsRecentes: database.obtenirInteractionsKit(5).map(interaction => ({
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
        
        // ✅ CORRECTION 5: Santé système avec distinction claire
        systemeSante: {
          servicePrincipal: 'UP', // ✅ Service local toujours UP
          baseDonnees: 'UP',      // ✅ Base mémoire toujours UP
          kitInterconnexion: kitInfo?.accessible ? 'UP' : 'DOWN', // ✅ Kit séparé
          modeIntegration: 'DIRECT_MULESOFT',
          urlKit: kitClient.baseURL,
          derniereMiseAJour: stats.derniereMiseAJour,
          // ✅ NOUVEAU: Impact sur fonctionnalités
          fonctionnalitesAffectees: kitInfo?.accessible ? [] : ['Transmission temps réel', 'Synchronisation inter-pays']
        }
      };

      // ✅ TOUJOURS 200 OK pour les statistiques locales
      res.status(200).json(reponse);
      
      console.log('📊 [Pays A] Statistiques envoyées - Kit status:', kitInfo?.accessible ? 'OK' : 'KO');
      
    } catch (error) {
      console.error('❌ [Pays A] Erreur récupération statistiques:', error);
      
      // ✅ CORRECTION 6: Même en cas d'erreur, essayer de retourner les stats de base
      try {
        const statsBasiques = database.obtenirStatistiques();
        res.status(200).json({
          status: 'PARTIAL', // ✅ Statut partiel mais utilisable
          message: 'Statistiques partielles disponibles',
          statistiques: statsBasiques,
          erreur: error.message,
          timestamp: new Date().toISOString()
        });
      } catch (fatalError) {
        // ✅ Erreur fatale uniquement si impossible d'accéder aux stats locales
        res.status(500).json({
          status: 'ERROR',
          message: 'Erreur fatale lors de la récupération des statistiques',
          erreur: fatalError.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else {
    res.status(405).json({ 
      erreur: 'Méthode non autorisée',
      methodesAutorisees: ['GET', 'OPTIONS']
    });
  }
};

// ✅ Fonction pour calculer des métriques avancées (inchangée mais optimisée)
function calculerMetriques(stats, interactions) {
  // Taux de réussite global
  const tauxReussiteGlobal = stats.transmissionsKit > 0 
    ? Math.round(((stats.transmissionsKit - stats.erreurs) / stats.transmissionsKit) * 100)
    : 100;

  // Latence moyenne des interactions réussies
  const interactionsAvecLatence = interactions
    .filter(i => i.donnees?.details?.latence && i.donnees?.details?.latence > 0)
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