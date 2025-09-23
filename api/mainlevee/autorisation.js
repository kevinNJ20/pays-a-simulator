// ============================================================================
// SÉNÉGAL - API Réception Autorisations Mainlevée (ÉTAPE 17 du workflow)
// Fichier: api/mainlevee/autorisation.js
// Port de Dakar - Pays de prime abord
// ============================================================================

const database = require('../../lib/database');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID, X-Authorization-Source, X-Source-Country, X-Payment-Reference');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // ✅ ÉTAPE 17 : Réception informations déclaration/recouvrement depuis Kit MuleSoft
      console.log('📥 [SÉNÉGAL] ÉTAPE 17: Réception informations déclaration/recouvrement depuis Kit MuleSoft');
      console.log('📋 [SÉNÉGAL] Données reçues:', JSON.stringify(req.body, null, 2));
      
      // ✅ Extraction des données d'autorisation du Kit MuleSoft
      const donneesAutorisation = req.body.autorisationMainlevee || req.body;
      
      // Validation
      if (!donneesAutorisation.numeroManifeste) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Numéro de manifeste requis pour autorisation mainlevée Sénégal',
          paysTraitement: {
            code: 'SEN',
            nom: 'Sénégal',
            port: 'Port de Dakar',
            role: 'PAYS_PRIME_ABORD'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Vérifier que le manifeste existe au Port de Dakar
      const manifeste = Array.from(database.manifestes.values())
        .find(m => m.numero_manif == donneesAutorisation.numeroManifeste || 
                   m.numeroManifeste === donneesAutorisation.numeroManifeste ||
                   m.id === donneesAutorisation.numeroManifeste);
      
      if (!manifeste) {
        console.log(`⚠️ [SÉNÉGAL] Manifeste ${donneesAutorisation.numeroManifeste} non trouvé au Port de Dakar`);
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Manifeste ${donneesAutorisation.numeroManifeste} non trouvé au Port de Dakar`,
          paysTraitement: {
            code: 'SEN',
            nom: 'Sénégal',
            port: 'Port de Dakar'
          },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ ÉTAPE 17 : Enregistrer les informations de déclaration/recouvrement
      const informationsDeclaration = {
        id: `DEC_REC_SEN_${Date.now()}`,
        numeroManifeste: donneesAutorisation.numeroManifeste,
        manifesteId: manifeste.id,
        
        // Informations de déclaration du pays de destination
        referenceDeclaration: donneesAutorisation.referenceDeclaration || donneesAutorisation.referenceAutorisation,
        paysDeclarant: donneesAutorisation.paysDeclarant || donneesAutorisation.paysDestination || 'PAYS_DESTINATION',
        montantAcquitte: parseFloat(donneesAutorisation.montantAcquitte || donneesAutorisation.montant || 0),
        monnaie: donneesAutorisation.monnaie || 'FCFA',
        
        // Informations de recouvrement
        referencePaiement: donneesAutorisation.referencePaiement || donneesAutorisation.referenceTransaction,
        datePaiement: donneesAutorisation.datePaiement || donneesAutorisation.dateRecouvrement,
        methodePaiement: donneesAutorisation.methodePaiement || 'BANCAIRE',
        
        // Métadonnées
        dateReception: new Date(),
        sourceKit: true,
        etapeWorkflow: 17,
        
        // Headers du Kit MuleSoft
        correlationId: req.headers['x-correlation-id'],
        sourceSystem: req.headers['x-authorization-source'] || 'KIT_MULESOFT',
        paysOrigine: req.headers['x-source-country'] || 'UNKNOWN'
      };

      // ✅ Appliquer les informations au manifeste (ÉTAPE 17)
      const manifesteMisAJour = database.recevoirInformationsDeclaration(informationsDeclaration);

      if (manifesteMisAJour) {
        console.log(`✅ [SÉNÉGAL] ÉTAPE 17 TERMINÉE: Informations déclaration/recouvrement reçues pour manifeste ${manifeste.id}`);
        console.log(`💰 [SÉNÉGAL] Montant acquitté: ${informationsDeclaration.montantAcquitte} ${informationsDeclaration.monnaie}`);
        console.log(`🏛️ [SÉNÉGAL] Pays déclarant: ${informationsDeclaration.paysDeclarant}`);
        console.log(`📋 [SÉNÉGAL] Référence paiement: ${informationsDeclaration.referencePaiement}`);
        console.log(`🎯 [SÉNÉGAL] Manifeste ${manifeste.id} → Statut: ${manifesteMisAJour.statut}`);
        console.log(`🔄 [SÉNÉGAL] Prochaines étapes: Apurement (18) et Levée (19)`);
      } else {
        console.error(`❌ [SÉNÉGAL] Impossible de mettre à jour le manifeste ${donneesAutorisation.numeroManifeste}`);
      }

      // ✅ Réponse adaptée pour MuleSoft et workflow Sénégal
      const reponse = {
        status: 'SUCCESS',
        message: '✅ ÉTAPE 17 SÉNÉGAL TERMINÉE - Informations déclaration/recouvrement acceptées',
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        workflow: {
          etapeComplétée: 17,
          etapeDescription: 'Réception informations déclaration/recouvrement du pays de destination',
          prochaine_etape: '18-19: Apurement du manifeste et attribution main levée',
          statusWorkflow: 'DECLARATION_RECUE',
          dureeDepuisCreation: manifeste.dateCreation ? 
            Math.round((new Date() - new Date(manifeste.dateCreation)) / (1000 * 60)) + ' minutes' : 'N/A'
        },
        
        informationsReçues: {
          id: informationsDeclaration.id,
          referenceDeclaration: informationsDeclaration.referenceDeclaration,
          numeroManifeste: informationsDeclaration.numeroManifeste,
          montantAcquitte: informationsDeclaration.montantAcquitte,
          monnaie: informationsDeclaration.monnaie,
          paysDeclarant: informationsDeclaration.paysDeclarant,
          referencePaiement: informationsDeclaration.referencePaiement,
          datePaiement: informationsDeclaration.datePaiement,
          dateReception: informationsDeclaration.dateReception
        },
        
        manifeste: {
          id: manifeste.id,
          numero: manifeste.numero_manif || manifeste.numeroManifeste,
          consignataire: manifeste.consignataire || manifeste.transporteur,
          navire: manifeste.navire,
          statutActuel: manifesteMisAJour.statut,
          peutEtreApure: manifesteMisAJour.statut === 'DECLARATION_RECUE',
          etapeWorkflow: manifesteMisAJour.etapeWorkflow
        },
        
        instructions: [
          '✅ ÉTAPE 17 terminée - Informations déclaration/recouvrement enregistrées',
          '📦 Le manifeste est maintenant prêt pour l\'apurement au Port de Dakar',
          '🔄 Prochaines étapes: Apurement (18) puis Attribution main levée (19)',
          '👤 Un agent des douanes peut maintenant procéder à l\'apurement',
          '📋 Référence de suivi: ' + informationsDeclaration.id,
          '💰 Montant acquitté confirmé: ' + informationsDeclaration.montantAcquitte + ' ' + informationsDeclaration.monnaie
        ],
        
        contact: {
          bureau: 'Bureau Principal Douanes Dakar',
          port: 'Port de Dakar',
          telephone: '+221-33-889-XX-XX',
          email: 'douanes.dakar@gouv.sn',
          horaires: 'Lundi-Vendredi 8h-17h, Samedi 8h-12h'
        },
        
        timestamp: new Date().toISOString(),
        correlationId: informationsDeclaration.correlationId
      };

      res.status(200).json(reponse);
      
    } else if (req.method === 'GET') {
      // ✅ Lister les autorisations reçues au Port de Dakar
      console.log('📋 [SÉNÉGAL] Demande liste autorisations mainlevée reçues');
      
      const manifestesAvecAutorisation = Array.from(database.manifestes.values())
        .filter(m => m.informationsDeclaration)
        .map(manifeste => ({
          id: manifeste.id,
          numeroManifeste: manifeste.numero_manif || manifeste.numeroManifeste,
          consignataire: manifeste.consignataire || manifeste.transporteur,
          navire: manifeste.navire,
          statut: manifeste.statut,
          
          autorisation: {
            id: manifeste.informationsDeclaration.id,
            referenceDeclaration: manifeste.informationsDeclaration.referenceDeclaration,
            montantAcquitte: manifeste.informationsDeclaration.montantAcquitte,
            monnaie: manifeste.informationsDeclaration.monnaie,
            paysDeclarant: manifeste.informationsDeclaration.paysDeclarant,
            referencePaiement: manifeste.informationsDeclaration.referencePaiement,
            dateReception: manifeste.informationsDeclaration.dateReception,
            sourceKit: manifeste.informationsDeclaration.sourceKit || false
          },
          
          peutEtreApure: manifeste.statut === 'DECLARATION_RECUE' && !manifeste.apurement,
          dejaApure: !!manifeste.apurement
        }))
        .sort((a, b) => new Date(b.autorisation.dateReception) - new Date(a.autorisation.dateReception));

      res.status(200).json({
        status: 'SUCCESS',
        message: `Liste des autorisations mainlevée reçues au Port de Dakar`,
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        autorisations: manifestesAvecAutorisation,
        
        statistiques: {
          total: manifestesAvecAutorisation.length,
          peutEtreApure: manifestesAvecAutorisation.filter(a => a.peutEtreApure).length,
          dejaApure: manifestesAvecAutorisation.filter(a => a.dejaApure).length,
          enAttente: manifestesAvecAutorisation.filter(a => !a.peutEtreApure && !a.dejaApure).length
        },
        
        workflow: {
          etape: 17,
          description: 'Autorisations de mainlevée reçues du pays de destination',
          prochainEtape: 'Apurement et levée (étapes 18-19)'
        },
        
        timestamp: new Date().toISOString()
      });
      
    } else {
      res.status(405).json({ 
        status: 'ERROR',
        message: 'Méthode non autorisée',
        methodesAutorisees: ['GET', 'POST', 'OPTIONS'],
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          port: 'Port de Dakar'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ [SÉNÉGAL] Erreur API autorisation mainlevée:', error);
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du traitement de l\'autorisation mainlevée au Port de Dakar',
      erreur: error.message,
      paysTraitement: {
        code: 'SEN',
        nom: 'Sénégal',
        port: 'Port de Dakar',
        role: 'PAYS_PRIME_ABORD'
      },
      timestamp: new Date().toISOString()
    });
  }
};