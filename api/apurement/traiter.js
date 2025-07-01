// ============================================================================
// PAYS A - Endpoint Apurement et Levée des Marchandises
// Fichier: api/apurement/traiter.js
// ============================================================================

const database = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Source-Country, X-Source-System, X-Correlation-ID, X-Payment-Reference');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Récupérer les infos d'apurement pour un manifeste/paiement
      const { numeroManifeste, referencePaiement } = req.query;
      
      console.log(`📋 [Pays A] Demande info apurement - Manifeste: ${numeroManifeste}, Paiement: ${referencePaiement}`);
      
      // Vérifier le manifeste
      const manifeste = database.obtenirManifeste(numeroManifeste);
      if (!manifeste) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Manifeste ${numeroManifeste} non trouvé`,
          timestamp: new Date().toISOString()
        });
      }

      // Vérifier l'autorisation de mainlevée
      const autorisation = manifeste.autorisationMainlevee;
      if (!autorisation) {
        return res.status(400).json({
          status: 'NO_AUTHORIZATION',
          message: 'Aucune autorisation de mainlevée pour ce manifeste',
          manifeste: {
            numero: manifeste.numeroManifeste,
            statut: manifeste.statut
          },
          timestamp: new Date().toISOString()
        });
      }

      // Préparer les données d'apurement
      const apurementData = {
        manifeste: {
          id: manifeste.id,
          numero: manifeste.numeroManifeste,
          transporteur: manifeste.transporteur,
          navire: manifeste.navire,
          dateArrivee: manifeste.dateArrivee,
          statut: manifeste.statut
        },
        autorisation: {
          reference: autorisation.referenceAutorisation,
          montant: autorisation.montantAcquitte,
          paysDeclarant: autorisation.paysDeclarant,
          dateReception: autorisation.dateReception
        },
        apurement: manifeste.apurement || null,
        peutEtreApure: manifeste.statut === 'MAINLEVEE_AUTORISEE' && !manifeste.apurement
      };

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Informations apurement récupérées',
        data: apurementData,
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'POST') {
      // Traiter l'apurement et la levée
      console.log('🔓 [Pays A] Traitement apurement et levée:', req.body);
      
      const { 
        numeroManifeste, 
        referencePaiement, 
        typeConfirmation, // 'BCEAO' ou 'DOUANE'
        agentConfirmation,
        observations 
      } = req.body;

      // Validation
      if (!numeroManifeste || !referencePaiement) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Numéro de manifeste et référence paiement requis',
          timestamp: new Date().toISOString()
        });
      }

      // Vérifier le manifeste
      const manifeste = database.obtenirManifeste(numeroManifeste);
      if (!manifeste) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Manifeste ${numeroManifeste} non trouvé`,
          timestamp: new Date().toISOString()
        });
      }

      // Vérifier que la mainlevée est autorisée
      if (manifeste.statut !== 'MAINLEVEE_AUTORISEE') {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Le manifeste doit avoir une mainlevée autorisée pour être apuré',
          statutActuel: manifeste.statut,
          timestamp: new Date().toISOString()
        });
      }

      // Vérifier qu'il n'est pas déjà apuré
      if (manifeste.apurement) {
        return res.status(400).json({
          status: 'ALREADY_PROCESSED',
          message: 'Ce manifeste a déjà été apuré',
          apurement: manifeste.apurement,
          timestamp: new Date().toISOString()
        });
      }

      // Créer l'enregistrement d'apurement
      const apurement = {
        id: `APU_${Date.now()}`,
        numeroManifeste,
        referencePaiement,
        typeConfirmation: typeConfirmation || 'DOUANE',
        agentConfirmation: agentConfirmation || 'AGENT_DOUANE',
        dateApurement: new Date(),
        observations: observations || '',
        statutApurement: 'CONFIRME'
      };

      // Mettre à jour le manifeste
      manifeste.statut = 'APURE_LEVE';
      manifeste.apurement = apurement;
      
      // Enregistrer dans les statistiques
      database.ajouterInteractionKit('APUREMENT_MANIFESTE', {
        manifesteId: manifeste.id,
        referencePaiement,
        typeConfirmation: apurement.typeConfirmation
      });

      console.log(`✅ [Pays A] Apurement confirmé: ${apurement.id}`);
      console.log(`📦 [Pays A] Manifeste ${numeroManifeste} -> Statut: APURE_LEVE`);

      // Notifier le Kit MuleSoft de l'apurement
      let notificationKit = null;
      try {
        console.log('📤 [Pays A] Notification apurement vers Kit MuleSoft...');
        
        const notificationData = {
          numeroManifeste,
          referencePaiement,
          typeApurement: 'LEVEE_MARCHANDISE',
          dateApurement: apurement.dateApurement,
          paysApurement: 'CIV',
          agentConfirmation: apurement.agentConfirmation,
          typeConfirmation: apurement.typeConfirmation,
          observations: apurement.observations
        };

        // Appel au Kit MuleSoft
        notificationKit = await kitClient.notifierApurement(notificationData);
        
        console.log('✅ [Pays A] Kit MuleSoft notifié de l\'apurement');
        
      } catch (kitError) {
        console.error('❌ [Pays A] Erreur notification Kit:', kitError.message);
        notificationKit = {
          success: false,
          erreur: kitError.message
        };
      }

      // Réponse finale
      const response = {
        status: 'SUCCESS',
        message: 'Apurement et levée confirmés avec succès',
        
        apurement: {
          id: apurement.id,
          numeroManifeste: apurement.numeroManifeste,
          referencePaiement: apurement.referencePaiement,
          typeConfirmation: apurement.typeConfirmation,
          dateApurement: apurement.dateApurement,
          statutApurement: apurement.statutApurement
        },
        
        manifeste: {
          id: manifeste.id,
          numero: manifeste.numeroManifeste,
          transporteur: manifeste.transporteur,
          statutActuel: manifeste.statut,
          peutEtreEnleve: true
        },
        
        notificationKit: notificationKit ? {
          success: notificationKit.success !== false,
          correlationId: notificationKit.correlationId,
          latence: notificationKit.latence
        } : null,
        
        instructions: [
          'L\'apurement a été confirmé avec succès',
          'Les marchandises peuvent être enlevées',
          'Le Kit d\'interconnexion a été notifié',
          'Le manifeste est maintenant clôturé'
        ],
        
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } else {
      res.status(405).json({ 
        erreur: 'Méthode non autorisée',
        methodesAutorisees: ['GET', 'POST', 'OPTIONS']
      });
    }
    
  } catch (error) {
    console.error('❌ [Pays A] Erreur API apurement:', error);
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du traitement de l\'apurement',
      erreur: error.message,
      timestamp: new Date().toISOString()
    });
  }
};