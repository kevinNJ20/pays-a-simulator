// ============================================================================
// SÉNÉGAL - API Apurement et Levée (Étapes 18-19 du workflow)
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
      // ✅ Récupérer les infos d'apurement pour un manifeste
      const { numeroManifeste, referencePaiement } = req.query;
      
      console.log(`🔍 [SÉNÉGAL] Demande info apurement - Manifeste: ${numeroManifeste}, Paiement: ${referencePaiement}`);
      
      // Chercher le manifeste
      const manifeste = Array.from(database.manifestes.values())
        .find(m => m.numero_manif == numeroManifeste || 
                   m.numeroManifeste === numeroManifeste ||
                   m.id === numeroManifeste);
      
      if (!manifeste) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Manifeste ${numeroManifeste} non trouvé au Port de Dakar`,
          paysTraitement: {
            code: 'SEN',
            nom: 'Sénégal',
            port: 'Port de Dakar'
          },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ Vérifier que les informations de déclaration/recouvrement ont été reçues (étape 17)
      if (!manifeste.informationsDeclaration && !manifeste.autorisationMainlevee) {
        return res.status(400).json({
          status: 'PREREQUIS_MANQUANT',
          message: 'Aucune information de déclaration/recouvrement reçue du pays de destination',
          etapeRequise: 'ÉTAPE 17: Réception informations déclaration/recouvrement',
          manifeste: {
            numero: manifeste.numero_manif || manifeste.numeroManifeste,
            statut: manifeste.statut,
            etapeWorkflow: manifeste.etapeWorkflow
          },
          instructions: [
            'Le pays de destination doit d\'abord traiter la déclaration (étapes 6-16)',
            'Le Sénégal doit recevoir les informations de recouvrement (étape 17)',
            'Puis l\'apurement pourra être traité (étapes 18-19)'
          ],
          timestamp: new Date().toISOString()
        });
      }

      // ✅ Préparer les données d'apurement
      const autorisationMainlevee = manifeste.autorisationMainlevee || manifeste.informationsDeclaration;
      
      const apurementData = {
        manifeste: {
          id: manifeste.id,
          numero: manifeste.numero_manif || manifeste.numeroManifeste,
          consignataire: manifeste.consignataire || manifeste.transporteur,
          navire: manifeste.navire,
          portDebarquement: 'Port de Dakar',
          dateArrivee: manifeste.date_arrivee || manifeste.dateArrivee,
          statut: manifeste.statut,
          etapeWorkflow: manifeste.etapeWorkflow
        },
        autorisation: {
          reference: autorisationMainlevee?.referenceAutorisation || autorisationMainlevee?.id,
          montant: autorisationMainlevee?.montantAcquitte || 0,
          paysDeclarant: autorisationMainlevee?.paysDeclarant || 'PAYS_DESTINATION',
          dateReception: autorisationMainlevee?.dateReception || autorisationMainlevee?.dateCreation
        },
        apurement: manifeste.apurement || null,
        peutEtreApure: manifeste.statut === 'DECLARATION_RECUE' && !manifeste.apurement,
        workflow: {
          etapesCompletes: '1-17',
          prochaine_etape: !manifeste.apurement ? 'ÉTAPE 18: Apurement manifeste' : 'ÉTAPE 19: Attribution main levée'
        }
      };

      res.status(200).json({
        status: 'SUCCESS',
        message: 'Informations apurement récupérées - Port de Dakar',
        data: apurementData,
        paysTraitement: {
          code: 'SEN', 
          nom: 'Sénégal',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'POST') {
      // ✅ ÉTAPE 18-19 : Traiter l'apurement et attribution main levée
      console.log('🔓 [SÉNÉGAL] ÉTAPES 18-19: Apurement et levée au Port de Dakar:', req.body);
      
      const { 
        numeroManifeste, 
        referencePaiement, 
        typeConfirmation, 
        agentConfirmation,
        observations 
      } = req.body;

      // Validation
      if (!numeroManifeste || !referencePaiement) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Numéro de manifeste et référence paiement requis pour apurement Sénégal',
          timestamp: new Date().toISOString()
        });
      }

      if (!agentConfirmation || agentConfirmation.trim() === '') {
        return res.status(400).json({
          status: 'ERROR', 
          message: 'Agent de confirmation requis pour apurement au Port de Dakar',
          timestamp: new Date().toISOString()
        });
      }

      // Chercher le manifeste
      const manifeste = Array.from(database.manifestes.values())
        .find(m => m.numero_manif == numeroManifeste || 
                   m.numeroManifeste === numeroManifeste ||
                   m.id === numeroManifeste);

      if (!manifeste) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Manifeste ${numeroManifeste} non trouvé au Port de Dakar`,
          timestamp: new Date().toISOString()
        });
      }

      // ✅ Vérifier les prérequis workflow
      if (manifeste.statut !== 'DECLARATION_RECUE' && manifeste.statut !== 'MAINLEVEE_AUTORISEE') {
        return res.status(400).json({
          status: 'WORKFLOW_ERROR',
          message: `Impossible d'apurer - étape 17 non complétée`,
          statutActuel: manifeste.statut,
          etapeRequise: 'ÉTAPE 17: Réception informations déclaration/recouvrement',
          timestamp: new Date().toISOString()
        });
      }

      // ✅ Vérifier qu'il n'est pas déjà apuré
      if (manifeste.apurement) {
        return res.status(400).json({
          status: 'ALREADY_PROCESSED',
          message: 'Ce manifeste a déjà été apuré au Port de Dakar',
          apurement: {
            id: manifeste.apurement.id,
            dateApurement: manifeste.apurement.dateApurement,
            agent: manifeste.apurement.agentConfirmation
          },
          timestamp: new Date().toISOString()
        });
      }

      console.log(`🔓 [SÉNÉGAL] ÉTAPE 18: Traitement apurement pour manifeste ${numeroManifeste}`);

      // ✅ ÉTAPE 18 : Apurement du manifeste
      const apurement = database.traiterApurement({
        numeroManifeste,
        referencePaiement,
        typeConfirmation: typeConfirmation || 'DOUANE',
        agentConfirmation: agentConfirmation.trim(),
        observations: observations || ''
      });

      console.log(`✅ [SÉNÉGAL] ÉTAPE 18 TERMINÉE: Apurement ${apurement.id} confirmé`);

      // ✅ ÉTAPE 19 : Attribution main levée (Bon à enlever)
      console.log(`🔓 [SÉNÉGAL] ÉTAPE 19: Attribution main levée pour manifeste ${manifeste.id}`);
      
      const bonEnlever = database.attribuerMainlevee(manifeste.id);
      
      console.log(`✅ [SÉNÉGAL] ÉTAPE 19 TERMINÉE: Bon à enlever ${bonEnlever.id} attribué`);
      console.log(`📦 [SÉNÉGAL] Manifeste ${numeroManifeste} -> Statut: ${manifeste.statut}`);
      console.log(`🏁 [SÉNÉGAL] WORKFLOW LIBRE PRATIQUE TERMINÉ (21 étapes)`);

      // ✅ Notification Kit MuleSoft de l'apurement (optionnel)
      let notificationKit = null;
      try {
        console.log('📤 [SÉNÉGAL] Notification apurement vers Kit MuleSoft...');
        
        const notificationData = {
          numeroManifeste,
          referencePaiement,
          typeApurement: 'LEVEE_MARCHANDISE',
          dateApurement: apurement.dateApurement,
          paysApurement: 'SEN',
          portApurement: 'Port de Dakar',
          agentConfirmation: apurement.agentConfirmation,
          typeConfirmation: apurement.typeConfirmation,
          observations: apurement.observations,
          bonEnlever: bonEnlever.id
        };

        notificationKit = await kitClient.notifierApurement(notificationData);
        console.log('✅ [SÉNÉGAL] Kit MuleSoft notifié de l\'apurement');
        
      } catch (kitError) {
        console.error('❌ [SÉNÉGAL] Erreur notification Kit (non bloquant):', kitError.message);
        notificationKit = {
          success: false,
          erreur: kitError.message
        };
      }

      // ✅ Réponse finale workflow Sénégal
      const response = {
        status: 'SUCCESS',
        message: '🎉 WORKFLOW SÉNÉGAL TERMINÉ - Apurement et levée confirmés avec succès',
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        workflow: {
          status: 'TERMINE',
          etapesCompletes: '1-19 (sur 21)',
          etapesRestantes: '20-21 (circulation libre dans l\'Union)',
          dureeTotal: manifeste.workflow?.etape1_manifesteRecu ? 
            Math.round((new Date() - new Date(manifeste.workflow.etape1_manifesteRecu)) / (1000 * 60)) + ' minutes' : 'N/A'
        },
        
        apurement: {
          id: apurement.id,
          numeroManifeste: apurement.numeroManifeste,
          referencePaiement: apurement.referencePaiement,
          typeConfirmation: apurement.typeConfirmation,
          agentConfirmation: apurement.agentConfirmation,
          dateApurement: apurement.dateApurement,
          statutApurement: apurement.statutApurement,
          etapeWorkflow: 18
        },
        
        bonEnlever: {
          id: bonEnlever.id,
          manifesteId: bonEnlever.manifesteId,
          numeroManifeste: bonEnlever.numeroManifeste,
          dateMainlevee: bonEnlever.dateMainlevee,
          portEnlevement: bonEnlever.portEnlevement,
          agentMainlevee: bonEnlever.agentMainlevee,
          referencePaiement: bonEnlever.referencePaiement,
          instructions: bonEnlever.instructions,
          etapeWorkflow: 19
        },
        
        manifeste: {
          id: manifeste.id,
          numero: manifeste.numero_manif || manifeste.numeroManifeste,
          consignataire: manifeste.consignataire || manifeste.transporteur,
          navire: manifeste.navire,
          statutFinal: manifeste.statut,
          peutEtreEnleve: true,
          workflowTermine: true
        },
        
        notificationKit: notificationKit ? {
          success: notificationKit.success !== false,
          correlationId: notificationKit.correlationId,
          message: notificationKit.success !== false ? 
            'Kit MuleSoft notifié avec succès' : 
            `Erreur notification Kit: ${notificationKit.erreur}`
        } : null,
        
        instructions: [
          '✅ ÉTAPE 18: Apurement confirmé avec succès',
          '✅ ÉTAPE 19: Bon à enlever attribué',
          '📦 Les marchandises peuvent être enlevées au Port de Dakar',
          '🏁 Workflow libre pratique Sénégal terminé (étapes 1-19)',
          '🔄 Étapes restantes: Délivrance marchandises (20) et libre circulation Union (21)',
          '📋 Le manifeste est maintenant clôturé côté Sénégal'
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
      
    } else {
      res.status(405).json({ 
        erreur: 'Méthode non autorisée',
        methodesAutorisees: ['GET', 'POST', 'OPTIONS'],
        paysTraitement: 'Sénégal - Port de Dakar'
      });
    }
    
  } catch (error) {
    console.error('❌ [SÉNÉGAL] Erreur API apurement:', error);
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du traitement de l\'apurement au Port de Dakar',
      erreur: error.message,
      paysTraitement: {
        code: 'SEN',
        nom: 'Sénégal',
        port: 'Port de Dakar'
      },
      timestamp: new Date().toISOString()
    });
  }
};