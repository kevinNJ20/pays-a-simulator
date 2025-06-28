const database = require('../../lib/database');

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
      // Paramètres de requête
      const limite = parseInt(req.query.limite) || 20;
      const statut = req.query.statut;
      const paysDestination = req.query.paysDestination;
      
      console.log(`📋 [Pays A] Demande liste manifestes (limite: ${limite})`);

      // Récupérer les manifestes
      let manifestes = database.listerManifestes(limite * 2); // Plus large pour le filtrage

      // Filtrage si nécessaire
      if (statut) {
        manifestes = manifestes.filter(m => m.statut === statut);
      }
      
      if (paysDestination) {
        manifestes = manifestes.filter(m => 
          m.marchandises?.some(marc => marc.paysDestination === paysDestination)
        );
      }

      // Limiter après filtrage
      manifestes = manifestes.slice(0, limite);

      // Transformer pour l'API
      const manifestesFormates = manifestes.map(manifeste => ({
        id: manifeste.id,
        numeroManifeste: manifeste.numeroManifeste,
        transporteur: manifeste.transporteur,
        navire: manifeste.navire,
        
        ports: {
          embarquement: manifeste.portEmbarquement,
          debarquement: manifeste.portDebarquement
        },
        
        dateArrivee: manifeste.dateArrivee,
        dateCreation: manifeste.dateCreation,
        statut: manifeste.statut,
        
        marchandises: {
          nombre: manifeste.marchandises?.length || 0,
          paysDestinations: [...new Set(manifeste.marchandises?.map(m => m.paysDestination) || [])],
          poidsTotal: manifeste.marchandises?.reduce((total, m) => total + (m.poidsBrut || 0), 0) || 0
        },
        
        transmission: manifeste.transmissionKit ? {
          statut: manifeste.transmissionKit.statut,
          dateTransmission: manifeste.transmissionKit.dateTransmission,
          latence: manifeste.transmissionKit.latence,
          reussie: manifeste.transmissionKit.statut === 'TRANSMIS'
        } : null,
        
        mainlevee: manifeste.autorisationMainlevee ? {
          autorisee: true,
          reference: manifeste.autorisationMainlevee.referenceAutorisation,
          montant: manifeste.autorisationMainlevee.montantAcquitte,
          dateReception: manifeste.autorisationMainlevee.dateReception
        } : {
          autorisee: false
        }
      }));

      // Statistiques pour cette requête
      const stats = {
        total: manifestesFormates.length,
        parStatut: manifestes.reduce((acc, m) => {
          acc[m.statut] = (acc[m.statut] || 0) + 1;
          return acc;
        }, {}),
        transmissions: {
          reussies: manifestes.filter(m => m.transmissionKit?.statut === 'TRANSMIS').length,
          echecs: manifestes.filter(m => m.transmissionKit?.statut === 'ERREUR').length,
          enAttente: manifestes.filter(m => !m.transmissionKit).length
        }
      };

      const reponse = {
        status: 'SUCCESS',
        message: `Liste de ${manifestesFormates.length} manifeste(s)`,
        
        manifestes: manifestesFormates,
        
        pagination: {
          limite,
          retournes: manifestesFormates.length,
          filtres: {
            ...(statut && { statut }),
            ...(paysDestination && { paysDestination })
          }
        },
        
        statistiques: stats,
        
        timestamp: new Date().toISOString()
      };

      res.status(200).json(reponse);
      
    } catch (error) {
      console.error('❌ [Pays A] Erreur liste manifestes:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur lors de la récupération des manifestes',
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