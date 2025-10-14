// ============================================================================
// SÉNÉGAL - API Liste Déclarations Transit
// Fichier: api/transit/lister.js
// ============================================================================

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
      const limite = parseInt(req.query.limite) || 20;
      const statut = req.query.statut;
      
      console.log(`🚛 [SÉNÉGAL] Demande liste transits Port de Dakar (limite: ${limite})`);
      if (statut) console.log(`🔍 [SÉNÉGAL] Filtre statut: ${statut}`);

      // Récupérer tous les transits du Sénégal
      let transits = Array.from(database.declarationsTransit.values())
        .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));

      // Filtrage par statut si demandé
      if (statut) {
        transits = transits.filter(t => t.statut === statut);
      }

      // Limiter après filtrage
      transits = transits.slice(0, limite);

      // Transformer pour l'API
      const transitsFormates = transits.map(transit => ({
        id: transit.id,
        numeroDeclaration: transit.numeroDeclaration,
        
        // Transport
        transporteur: transit.transporteur,
        modeTransport: transit.modeTransport,
        itineraire: transit.itineraire,
        delaiRoute: transit.delaiRoute,
        
        // Origine/Destination
        paysDepart: transit.paysDepart,
        paysDestination: transit.paysDestination,
        portDepart: transit.portDepart || 'Port de Dakar',
        bureauDepart: transit.bureauDepart,
        
        // Statut et dates
        statut: transit.statut,
        dateCreation: transit.dateCreation,
        
        // Marchandises
        marchandises: {
          nombre: transit.marchandises?.length || 0,
          poidsTotal: transit.marchandises?.reduce((sum, m) => sum + (m.poids || 0), 0) || 0
        },
        
        // Garanties
        cautionRequise: transit.cautionRequise || 0,
        referenceCaution: transit.referenceCaution,
        
        // Workflow
        etapesTransit: transit.etapesTransit,
        messageArrivee: transit.messageArrivee ? {
          recu: true,
          dateArrivee: transit.messageArrivee.dateArrivee,
          bureauArrivee: transit.messageArrivee.bureauArrivee,
          controleEffectue: transit.messageArrivee.controleEffectue
        } : {
          recu: false,
          enAttente: true
        }
      }));

      // Statistiques
      const stats = {
        total: transitsFormates.length,
        parStatut: transits.reduce((acc, t) => {
          acc[t.statut] = (acc[t.statut] || 0) + 1;
          return acc;
        }, {}),
        parDestination: transits.reduce((acc, t) => {
          acc[t.paysDestination] = (acc[t.paysDestination] || 0) + 1;
          return acc;
        }, {})
      };

      res.status(200).json({
        status: 'SUCCESS',
        message: `Liste de ${transitsFormates.length} transit(s) du Port de Dakar`,
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        transits: transitsFormates,
        
        pagination: {
          limite,
          retournes: transitsFormates.length,
          filtres: {
            ...(statut && { statut })
          }
        },
        
        statistiques: stats,
        
        workflow: {
          etapesDisponibles: [
            'TRANSIT_CREE', 'ARRIVEE_CONFIRMEE', 'TRANSIT_APURE'
          ]
        },
        
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [SÉNÉGAL] Erreur liste transits:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur lors de la récupération des transits du Port de Dakar',
        erreur: error.message,
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          port: 'Port de Dakar'
        },
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