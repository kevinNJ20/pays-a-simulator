// ============================================================================
// SÉNÉGAL - API Réception Message Arrivée Transit (ÉTAPE 14)
// Fichier: api/transit/arrivee.js
// ============================================================================

const database = require('../../lib/database');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Source-Country, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      console.log('📥 [SÉNÉGAL] ÉTAPE 14: Réception message arrivée transit depuis Mali');
      console.log('📋 [SÉNÉGAL] Données reçues:', JSON.stringify(req.body, null, 2));
      
      const messageArrivee = req.body.messageArrivee || req.body;
      
      // Validation
      if (!messageArrivee.numeroDeclaration) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Numéro déclaration requis',
          timestamp: new Date().toISOString()
        });
      }

      // Chercher le transit
      const transitId = Array.from(database.declarationsTransit.keys())
        .find(id => {
          const transit = database.declarationsTransit.get(id);
          return transit.numeroDeclaration === messageArrivee.numeroDeclaration;
        });
      
      if (!transitId) {
        console.log(`⚠️ [SÉNÉGAL] Transit ${messageArrivee.numeroDeclaration} non trouvé`);
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Transit ${messageArrivee.numeroDeclaration} non trouvé au Port de Dakar`,
          timestamp: new Date().toISOString()
        });
      }

      // ✅ ÉTAPE 14 : Enregistrer message arrivée
      const transitMisAJour = database.recevoirMessageArrivee(transitId, {
        ...messageArrivee,
        dateReception: new Date(),
        etapeTransit: 14
      });

      console.log(`✅ [SÉNÉGAL] ÉTAPE 14 TERMINÉE: Message arrivée enregistré pour transit ${transitId}`);
      console.log(`📍 [SÉNÉGAL] Bureau arrivée: ${messageArrivee.bureauArrivee || 'N/A'}`);
      console.log(`✓ [SÉNÉGAL] Contrôles effectués: ${messageArrivee.controleEffectue ? 'OUI' : 'NON'}`);
      console.log(`🎯 [SÉNÉGAL] Transit ${transitId} → Statut: ${transitMisAJour.statut}`);

      // ✅ Réponse workflow Sénégal
      res.status(200).json({
        status: 'SUCCESS',
        message: '✅ ÉTAPE 14 SÉNÉGAL TERMINÉE - Message arrivée accepté',
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        workflow: {
          etapeComplétée: 14,
          etapeDescription: 'Réception message arrivée depuis Mali',
          prochaine_etape: '15-16: Apurement transit au Sénégal',
          statusWorkflow: transitMisAJour.statut
        },
        
        messageArrivee: {
          numeroDeclaration: messageArrivee.numeroDeclaration,
          bureauArrivee: messageArrivee.bureauArrivee,
          dateArrivee: messageArrivee.dateArrivee,
          controleEffectue: messageArrivee.controleEffectue,
          visaAppose: messageArrivee.visaAppose,
          conformiteItineraire: messageArrivee.conformiteItineraire,
          delaiRespecte: messageArrivee.delaiRespecte,
          dateReception: new Date().toISOString()
        },
        
        transit: {
          id: transitId,
          numeroDeclaration: transitMisAJour.numeroDeclaration,
          transporteur: transitMisAJour.transporteur,
          paysDestination: transitMisAJour.paysDestination,
          statutActuel: transitMisAJour.statut,
          peutEtreApure: transitMisAJour.statut === 'ARRIVEE_CONFIRMEE'
        },
        
        instructions: [
          '✅ ÉTAPE 14 terminée - Message arrivée enregistré',
          '📦 Le transit peut maintenant être apuré',
          '🔄 Prochaines étapes: Apurement (15-16) au Port de Dakar',
          '💰 Libération des garanties après apurement'
        ],
        
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [SÉNÉGAL] Erreur réception message arrivée:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur traitement message arrivée transit',
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
      methodesAutorisees: ['POST', 'OPTIONS']
    });
  }
};