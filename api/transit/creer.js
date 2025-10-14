// ============================================================================
// SÉNÉGAL - API Création Déclaration Transit (ÉTAPES 1-6)
// Fichier: api/transit/creer.js
// Workflow Transit - Port de Dakar vers pays enclavés
// ============================================================================

const database = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Source-Country, X-Source-System');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      console.log('\n🚛 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log('🚛 [SÉNÉGAL] DÉBUT WORKFLOW TRANSIT - ÉTAPES 1-6');
      console.log('🚛 [SÉNÉGAL] Port de Dakar → Pays de destination');
      console.log('🚛 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log('📋 [SÉNÉGAL] Données transit reçues:', JSON.stringify(req.body, null, 2));

      const donneesTransit = req.body;

      // ✅ Validation des données transit
      const erreurs = [];
      
      if (!donneesTransit.numeroDeclaration || donneesTransit.numeroDeclaration.trim() === '') {
        erreurs.push('Numéro déclaration transit requis');
      }
      
      if (!donneesTransit.transporteur || donneesTransit.transporteur.trim() === '') {
        erreurs.push('Transporteur requis');
      }
      
      if (!donneesTransit.paysDestination || donneesTransit.paysDestination.trim() === '') {
        erreurs.push('Pays de destination requis');
      }
      
      if (!donneesTransit.marchandises || !Array.isArray(donneesTransit.marchandises) || donneesTransit.marchandises.length === 0) {
        erreurs.push('Au moins une marchandise requise pour transit');
      }

      if (erreurs.length > 0) {
        console.error('❌ [SÉNÉGAL] Validation transit échouée:', erreurs);
        return res.status(400).json({
          status: 'ERROR',
          message: 'Validation transit échouée',
          erreurs,
          paysTraitement: {
            code: 'SEN',
            nom: 'Sénégal',
            port: 'Port de Dakar'
          },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ ÉTAPES 1-6 : Création déclaration transit au Port de Dakar
      console.log('🚛 [SÉNÉGAL] ÉTAPES 1-6: Création déclaration transit...');
      
      const transitCree = database.creerDeclarationTransit({
        ...donneesTransit,
        paysDepart: 'SEN',
        bureauDepart: donneesTransit.bureauDepart || '18N_DAKAR',
        dateCreation: new Date(),
        portDepart: 'Port de Dakar',
        modeTransport: donneesTransit.modeTransport || 'ROUTIER',
        itineraire: donneesTransit.itineraire || `Dakar → ${donneesTransit.paysDestination}`,
        delaiRoute: donneesTransit.delaiRoute || '72 heures',
        cautionRequise: parseFloat(donneesTransit.cautionRequise) || 0,
        referenceCaution: donneesTransit.referenceCaution || ''
      });

      console.log(`✅ [SÉNÉGAL] ÉTAPES 1-6 COMPLÉTÉES: Transit ${transitCree.id} créé`);

      // ✅ ÉTAPES 10-11 : Transmission copie vers Kit MuleSoft (puis Mali)
      let transmissionKitReussie = false;
      let reponseKit = null;

      try {
        console.log('\n🚀 [SÉNÉGAL] ═══ ÉTAPES 10-11: TRANSMISSION COPIE VERS KIT ═══');
        console.log(`🎯 [SÉNÉGAL] Transit: ${transitCree.numeroDeclaration}`);
        console.log(`🔗 [SÉNÉGAL] Kit → Mali (copie pour préparation arrivée)`);
        
        const startTime = Date.now();
        
        // Appel Kit MuleSoft pour transmission copie transit
        reponseKit = await kitClient.transmettreTransit(transitCree);
        const duration = Date.now() - startTime;
        
        transmissionKitReussie = true;
        console.log(`\n🎉 [SÉNÉGAL] ═══ ÉTAPES 10-11 RÉUSSIES ═══`);
        console.log(`✅ [SÉNÉGAL] Durée transmission: ${duration}ms`);
        console.log(`✅ [SÉNÉGAL] Copie transit transmise vers Mali via Kit`);
        
      } catch (kitError) {
        transmissionKitReussie = false;
        console.error(`\n💥 [SÉNÉGAL] ═══ ÉCHEC ÉTAPES 10-11 ═══`);
        console.error(`❌ [SÉNÉGAL] Erreur: ${kitError.message}`);
        
        reponseKit = {
          status: 'ERROR',
          message: kitError.message,
          success: false
        };
      }

      // ✅ Réponse finale
      const statusCode = transmissionKitReussie ? 200 : 206;
      const responseStatus = transmissionKitReussie ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      
      const reponse = {
        status: responseStatus,
        message: transmissionKitReussie 
          ? '🎉 Déclaration transit créée et copie transmise avec succès'
          : '⚠️ Transit créé au Port de Dakar, erreur transmission Kit',
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        transit: {
          id: transitCree.id,
          numeroDeclaration: transitCree.numeroDeclaration,
          transporteur: transitCree.transporteur,
          paysDepart: transitCree.paysDepart,
          paysDestination: transitCree.paysDestination,
          portDepart: transitCree.portDepart,
          modeTransport: transitCree.modeTransport,
          itineraire: transitCree.itineraire,
          delaiRoute: transitCree.delaiRoute,
          statut: transitCree.statut,
          dateCreation: transitCree.dateCreation,
          nombreMarchandises: transitCree.marchandises?.length || 0
        },
        
        workflow: {
          etapesCompletes: transmissionKitReussie ? '1-11' : '1-6',
          prochaine_etape: transmissionKitReussie ? 
            'Attente arrivée Mali (étapes 13-14)' :
            'Retry transmission vers Kit MuleSoft',
          statut_workflow: transitCree.statut
        },
        
        transmissionKit: {
          reussie: transmissionKitReussie,
          timestamp: new Date().toISOString(),
          ...(transmissionKitReussie && reponseKit && {
            succes: {
              status: reponseKit.status || 'UNKNOWN',
              message: 'Copie transit transmise vers Mali via Kit',
              correlationId: reponseKit.correlationId || null
            }
          }),
          ...(reponseKit && !transmissionKitReussie && {
            echec: {
              erreur: reponseKit.erreur || reponseKit.message || 'Erreur Kit',
              retryRecommended: true
            }
          })
        },
        
        instructions: transmissionKitReussie ? [
          '✅ Transit créé au Port de Dakar (étapes 1-6)',
          '✅ Copie transmise au Kit MuleSoft (étapes 10-11)',
          '🔄 Kit va transmettre copie vers Mali',
          '⏳ Attente arrivée au Mali (étapes 13-14)',
          '📋 Le Mali enverra message arrivée via Kit'
        ] : [
          '✅ Transit créé au Port de Dakar (étapes 1-6)',
          '❌ Échec transmission copie vers Kit',
          '⚠️ Le Mali ne recevra pas la copie',
          '🔧 Vérifiez connectivité Kit MuleSoft'
        ],
        
        timestamp: new Date().toISOString()
      };

      console.log('\n🏁 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log(`🏁 [SÉNÉGAL] WORKFLOW TRANSIT RÉSULTAT: ${responseStatus}`);
      console.log(`📋 [SÉNÉGAL] Transit: ${transitCree.id} - Kit: ${transmissionKitReussie ? 'OK' : 'KO'}`);
      console.log('🏁 [SÉNÉGAL] ═══════════════════════════════════════════════════════');

      res.status(statusCode).json(reponse);
      
    } catch (error) {
      console.error('\n💥 [SÉNÉGAL] ═══ ERREUR FATALE WORKFLOW TRANSIT ═══');
      console.error('❌ [SÉNÉGAL] Erreur:', error.message);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur fatale workflow transit Sénégal',
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
      methodesAutorisees: ['POST', 'OPTIONS'],
      paysTraitement: 'Sénégal - Port de Dakar'
    });
  }
};