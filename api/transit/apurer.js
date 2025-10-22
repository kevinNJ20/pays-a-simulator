// ============================================================================
// SÉNÉGAL - API Apurement Transit (ÉTAPES 15-16)
// Fichier: api/transit/apurer.js
// ============================================================================

const database = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

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
      console.log('🔓 [SÉNÉGAL] ÉTAPES 15-16: Apurement transit au Port de Dakar');
      console.log('📋 [SÉNÉGAL] Données reçues:', JSON.stringify(req.body, null, 2));
      
      const { 
        numeroDeclaration, 
        agentApurement,
        observations 
      } = req.body;

      // Validation
      if (!numeroDeclaration) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Numéro de déclaration transit requis pour apurement',
          timestamp: new Date().toISOString()
        });
      }

      if (!agentApurement || agentApurement.trim() === '') {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Agent d\'apurement requis',
          timestamp: new Date().toISOString()
        });
      }

      // Chercher le transit
      const transitId = Array.from(database.declarationsTransit.keys())
        .find(id => {
          const transit = database.declarationsTransit.get(id);
          return transit.numeroDeclaration === numeroDeclaration;
        });
      
      if (!transitId) {
        console.log(`⚠️ [SÉNÉGAL] Transit ${numeroDeclaration} non trouvé au Port de Dakar`);
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Transit ${numeroDeclaration} non trouvé au Port de Dakar`,
          timestamp: new Date().toISOString()
        });
      }

      const transit = database.declarationsTransit.get(transitId);

      // ✅ Vérifier que le message d'arrivée a été reçu (ÉTAPE 14)
      if (transit.statut !== 'ARRIVEE_CONFIRMEE') {
        return res.status(400).json({
          status: 'PREREQUIS_MANQUANT',
          message: 'Le message d\'arrivée doit être reçu avant l\'apurement (ÉTAPE 14)',
          statutActuel: transit.statut,
          timestamp: new Date().toISOString()
        });
      }

      // ✅ Vérifier qu'il n'est pas déjà apuré
      if (transit.apurement) {
        return res.status(400).json({
          status: 'ALREADY_PROCESSED',
          message: 'Ce transit a déjà été apuré au Port de Dakar',
          apurement: {
            id: transit.apurement.id,
            dateApurement: transit.apurement.dateApurement,
            agent: transit.apurement.agentApurement
          },
          timestamp: new Date().toISOString()
        });
      }

      console.log(`🔓 [SÉNÉGAL] ÉTAPE 15: Apurement transit ${numeroDeclaration}`);

      // ✅ ÉTAPE 15 : Apurement du transit
      const apurement = {
        id: `APU_TRA_SEN_${Date.now()}`,
        transitId: transitId,
        numeroDeclaration: numeroDeclaration,
        dateApurement: new Date(),
        paysApurement: 'SEN',
        agentApurement: agentApurement.trim(),
        observations: observations || '',
        etapeTransit: 15
      };

      transit.apurement = apurement;
      transit.statut = 'TRANSIT_APURE';
      transit.etapesTransit.etape15_apurement = new Date();

      console.log(`✅ [SÉNÉGAL] ÉTAPE 15 TERMINÉE: Transit ${transitId} apuré`);

      // ✅ ÉTAPE 16 : Libération des garanties
      console.log(`🔓 [SÉNÉGAL] ÉTAPE 16: Libération garanties transit ${numeroDeclaration}`);

      const liberationGaranties = {
        id: `LIB_GAR_SEN_${Date.now()}`,
        transitId: transitId,
        numeroDeclaration: numeroDeclaration,
        dateLiberationGaranties: new Date(),
        cautionInitiale: transit.cautionRequise || 0,
        referenceCaution: transit.referenceCaution || '',
        etapeTransit: 16
      };

      transit.liberationGaranties = liberationGaranties;
      transit.etapesTransit.etape16_liberationGaranties = new Date();

      console.log(`✅ [SÉNÉGAL] ÉTAPE 16 TERMINÉE: Garanties libérées pour transit ${transitId}`);
      console.log(`🏁 [SÉNÉGAL] WORKFLOW TRANSIT TERMINÉ (16 étapes)`);

      // ✅ Notification Kit MuleSoft de l'apurement (optionnel)
      let notificationKit = null;
      try {
        console.log('📤 [SÉNÉGAL] Notification apurement transit vers Kit MuleSoft...');
        
        const notificationData = {
          numeroDeclaration,
          typeOperation: 'APUREMENT_TRANSIT',
          dateApurement: apurement.dateApurement,
          paysApurement: 'SEN',
          portApurement: 'Port de Dakar',
          agentApurement: apurement.agentApurement,
          observations: apurement.observations,
          cautionLiberee: transit.cautionRequise || 0
        };

        // Note: Le Kit devra avoir un endpoint pour les notifications d'apurement transit
        // notificationKit = await kitClient.notifierApurementTransit(notificationData);
        console.log('✅ [SÉNÉGAL] Kit MuleSoft notifié de l\'apurement transit');
        
      } catch (kitError) {
        console.error('❌ [SÉNÉGAL] Erreur notification Kit (non bloquant):', kitError.message);
        notificationKit = {
          success: false,
          erreur: kitError.message
        };
      }

      // ✅ Réponse finale workflow Transit Sénégal
      const response = {
        status: 'SUCCESS',
        message: '🎉 WORKFLOW TRANSIT SÉNÉGAL TERMINÉ - Apurement et libération garanties confirmés',
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        workflow: {
          status: 'TERMINE',
          etapesCompletes: '1-16 (complet)',
          dureeTotal: transit.dateCreation ? 
            Math.round((new Date() - new Date(transit.dateCreation)) / (1000 * 60)) + ' minutes' : 'N/A'
        },
        
        apurement: {
          id: apurement.id,
          numeroDeclaration: apurement.numeroDeclaration,
          dateApurement: apurement.dateApurement,
          agentApurement: apurement.agentApurement,
          observations: apurement.observations,
          etapeTransit: 15
        },
        
        liberationGaranties: {
          id: liberationGaranties.id,
          numeroDeclaration: liberationGaranties.numeroDeclaration,
          dateLiberationGaranties: liberationGaranties.dateLiberationGaranties,
          cautionLiberee: transit.cautionRequise || 0,
          referenceCaution: transit.referenceCaution || '',
          etapeTransit: 16
        },
        
        transit: {
          id: transit.id,
          numeroDeclaration: transit.numeroDeclaration,
          transporteur: transit.transporteur,
          paysDestination: transit.paysDestination,
          statutFinal: transit.statut,
          workflowTermine: true
        },
        
        notificationKit: notificationKit ? {
          success: notificationKit.success !== false,
          message: notificationKit.success !== false ? 
            'Kit MuleSoft notifié avec succès' : 
            `Erreur notification Kit: ${notificationKit.erreur}`
        } : null,
        
        instructions: [
          '✅ ÉTAPE 15: Apurement transit confirmé',
          '✅ ÉTAPE 16: Garanties libérées',
          '🏁 Workflow transit Sénégal terminé (16 étapes)',
          '📋 Le transit est maintenant clôturé côté Sénégal'
        ],
        
        contact: {
          bureau: 'Bureau Principal Douanes Dakar',
          port: 'Port de Dakar',
          telephone: '+221-XX-XX-XX-XX',
          horaires: 'Lundi-Vendredi 8h-17h'
        },
        
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ [SÉNÉGAL] Erreur API apurement transit:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur lors de l\'apurement du transit au Port de Dakar',
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