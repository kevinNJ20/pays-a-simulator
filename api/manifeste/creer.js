// ============================================================================
// PAYS A SÉNÉGAL - API Création Manifeste Corrigée
// Fichier: api/manifeste/creer.js - ÉTAPES 1-5 du workflow
// ============================================================================

const database = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Source-Country, X-Source-System');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    let manifeste = null;
    let transmissionKitReussie = false;
    let reponseKit = null;
    
    try {
      console.log('\n🇸🇳 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log('🇸🇳 [SÉNÉGAL] DÉBUT WORKFLOW LIBRE PRATIQUE - ÉTAPES 1-5');
      console.log('🇸🇳 [SÉNÉGAL] Port de Dakar → Pays de destination');
      console.log('🇸🇳 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log('📋 [SÉNÉGAL] Données reçues:', JSON.stringify(req.body, null, 2));

      // ✅ ÉTAPE 1 : Téléchargement manifeste d'entrée par consignataire
      console.log('📥 [SÉNÉGAL] ÉTAPE 1: Téléchargement manifeste d\'entrée...');
      
      const formatDetecte = detecterFormatDonnees(req.body);
      console.log(`🔍 [SÉNÉGAL] Format détecté: ${formatDetecte}`);

      let donneesNettoyees;
      if (formatDetecte === 'UEMOA') {
        donneesNettoyees = nettoyerDonneesUEMOA(req.body);
      } else {
        donneesNettoyees = nettoyerDonneesManifeste(req.body);
      }

      // ✅ Validation spécifique Sénégal
      const erreurs = validerDonneesManifeste(donneesNettoyees, formatDetecte);
      if (erreurs.length > 0) {
        console.error('❌ [SÉNÉGAL] Validation échouée:', erreurs);
        return res.status(400).json({
          status: 'ERROR',
          message: 'Validation échouée - données manifeste invalides',
          erreurs,
          paysTraitement: 'SÉNÉGAL',
          portTraitement: 'Port de Dakar',
          timestamp: new Date().toISOString()
        });
      }

      // ✅ ÉTAPES 2-3 : Renseignement et enregistrement informations marchandise
      console.log('💾 [SÉNÉGAL] ÉTAPES 2-3: Enregistrement informations marchandise...');
      manifeste = database.creerManifeste(donneesNettoyees);
      console.log(`✅ [SÉNÉGAL] ÉTAPES 1-3 COMPLÉTÉES: Manifeste ${manifeste.id} créé au Port de Dakar`);

      // ✅ ÉTAPE 4-5 : Transmission automatique vers Kit d'interconnexion
      console.log('\n🚀 [SÉNÉGAL] ═══ ÉTAPES 4-5: TRANSMISSION VERS KIT MULESOFT ═══');
      console.log(`🎯 [SÉNÉGAL] Extraction marchandises pour pays de destination`);
      console.log(`🔗 [SÉNÉGAL] URL Kit: ${kitClient.baseURL}/manifeste/transmission`);
      
      try {
        console.log(`⏳ [SÉNÉGAL] Transmission Kit MuleSoft en cours...`);
        const startTime = Date.now();
        
        reponseKit = await kitClient.transmettreManifeste(manifeste);
        const duration = Date.now() - startTime;
        
        transmissionKitReussie = true;
        console.log(`\n🎉 [SÉNÉGAL] ═══ ÉTAPES 4-5 RÉUSSIES ═══`);
        console.log(`✅ [SÉNÉGAL] Durée transmission: ${duration}ms`);
        console.log(`✅ [SÉNÉGAL] Status Kit: ${reponseKit?.status || 'N/A'}`);
        console.log(`✅ [SÉNÉGAL] Extraction transmise vers pays de destination`);
        console.log(`🎯 [SÉNÉGAL] ➤ Kit MuleSoft doit maintenant router vers le pays de destination`);
        
      } catch (kitError) {
        transmissionKitReussie = false;
        console.error(`\n💥 [SÉNÉGAL] ═══ ÉCHEC ÉTAPES 4-5 ═══`);
        console.error(`❌ [SÉNÉGAL] Erreur: ${kitError.message}`);
        console.error(`❌ [SÉNÉGAL] L'extraction n'a pas pu être transmise au pays de destination`);
        
        reponseKit = {
          status: 'ERROR',
          message: kitError.message,
          erreur: kitError.message,
          timestamp: new Date(),
          success: false
        };
      }

      // ✅ Enregistrement résultat transmission (mise à jour workflow)
      console.log('\n📝 [SÉNÉGAL] Mise à jour workflow manifeste...');
      try {
        database.enregistrerTransmissionKit(manifeste.id, reponseKit, transmissionKitReussie);
        console.log(`✅ [SÉNÉGAL] Workflow mis à jour: ${transmissionKitReussie ? 'TRANSMIS_VERS_DESTINATION' : 'ERREUR_TRANSMISSION'}`);
      } catch (dbError) {
        console.error(`❌ [SÉNÉGAL] Erreur mise à jour workflow:`, dbError);
      }

      // ✅ Réponse finale adaptée au workflow Sénégal
      const statusCode = transmissionKitReussie ? 200 : 206;
      const responseStatus = transmissionKitReussie ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      
      const reponse = {
        status: responseStatus,
        message: transmissionKitReussie 
          ? '🎉 Manifeste Sénégal créé et extraction transmise avec succès vers pays de destination'
          : '⚠️ Manifeste Sénégal créé au Port de Dakar, erreur transmission vers pays de destination',
        
        // ✅ Informations spécifiques Sénégal
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal', 
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        manifeste: {
          id: manifeste.id,
          numero_manif: manifeste.numero_manif,
          numeroManifeste: manifeste.numeroManifeste,
          consignataire: manifeste.consignataire,
          navire: manifeste.navire,
          provenance: manifeste.provenance,
          portDebarquement: manifeste.portDebarquement || 'Port de Dakar',
          formatOriginal: formatDetecte,
          nombreArticles: manifeste.nbre_article || manifeste.marchandises?.length || 0,
          statut: manifeste.statut,
          etapeWorkflow: manifeste.etapeWorkflow,
          dateCreation: manifeste.dateCreation,
          paysDestinations: (manifeste.articles || manifeste.marchandises || [])
            .map(item => item.pays_dest || item.paysDestination)
            .filter(Boolean)
        },
        
        workflow: {
          etapesCompletes: transmissionKitReussie ? '1-5' : '1-3',
          prochaine_etape: transmissionKitReussie ? 
            'Attente déclaration pays de destination (étapes 6-16)' :
            'Retry transmission vers Kit MuleSoft',
          statut_workflow: manifeste.etapeWorkflow,
          details_workflow: manifeste.workflow
        },
        
        transmissionKit: {
          urlKit: kitClient.baseURL + '/manifeste/transmission',
          reussie: transmissionKitReussie,
          timestamp: new Date().toISOString(),
          ...(transmissionKitReussie && reponseKit && {
            succes: {
              status: reponseKit.status || 'UNKNOWN',
              message: reponseKit.message || 'Extraction transmise vers pays de destination',
              correlationId: reponseKit.correlationId || null,
              latence: reponseKit.latence || reponseKit.metadata?.duration || 0,
              prochaine_etape: 'Routage vers pays de destination par Kit MuleSoft'
            }
          }),
          ...(reponseKit && !transmissionKitReussie && {
            echec: {
              erreur: reponseKit.erreur || reponseKit.message || 'Erreur inconnue',
              statusCode: reponseKit.statusCode || null,
              retryRecommended: reponseKit.retryRecommended || false,
              cause: 'Kit MuleSoft inaccessible ou erreur de traitement',
              impact: 'Pays de destination ne recevra pas l\'extraction du manifeste'
            }
          })
        },
        
        instructions: transmissionKitReussie ? [
          '✅ Manifeste enregistré au Port de Dakar (Sénégal)',
          '✅ Informations marchandise renseignées et stockées',
          '✅ Extraction transmise au Kit MuleSoft avec succès', 
          '🔄 Kit MuleSoft va router l\'extraction vers le pays de destination',
          '⏳ Attente traitement par le pays de destination (étapes 6-16)',
          '📋 Le Sénégal recevra les informations de déclaration/recouvrement (étape 17)'
        ] : [
          '✅ Manifeste enregistré au Port de Dakar (Sénégal)',
          '✅ Informations marchandise renseignées et stockées',
          '❌ Échec transmission extraction vers Kit MuleSoft',
          '⚠️ Le pays de destination ne recevra pas l\'extraction',
          '🔧 Vérifiez la connectivité Kit MuleSoft',
          '🔄 Réessayez la création ou contactez l\'administrateur'
        ],
        
        diagnostic: {
          formatDetecte,
          manifesteLocal: '✅ CRÉÉ au Port de Dakar',
          transmissionKit: transmissionKitReussie ? '✅ EXTRACTION TRANSMISE' : '❌ ÉCHEC TRANSMISSION',
          workflow_senegal: transmissionKitReussie ? 'ÉTAPES 1-5 TERMINÉES' : 'ÉTAPES 1-3 TERMINÉES',
          pays_destination: transmissionKitReussie ? '🔄 VA RECEVOIR EXTRACTION' : '❌ NE RECEVRA PAS EXTRACTION'
        },
        
        timestamp: new Date().toISOString()
      };

      console.log('\n🏁 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log(`🏁 [SÉNÉGAL] WORKFLOW RÉSULTAT: ${responseStatus}`);
      console.log(`📋 [SÉNÉGAL] Manifeste: ${manifeste.id} - Port: Dakar - Kit: ${transmissionKitReussie ? 'OK' : 'KO'}`);
      console.log(`🎯 [SÉNÉGAL] Prochaines étapes: ${transmissionKitReussie ? 'Pays destination (6-16) puis retour Sénégal (17-19)' : 'Retry transmission Kit'}`);
      console.log('🏁 [SÉNÉGAL] ═══════════════════════════════════════════════════════');

      res.status(statusCode).json(reponse);
      
    } catch (error) {
      console.error('\n💥 [SÉNÉGAL] ═══ ERREUR FATALE WORKFLOW ═══');
      console.error('❌ [SÉNÉGAL] Erreur:', error.message);
      console.error('📋 [SÉNÉGAL] Port traitement: Port de Dakar');
      
      const errorResponse = {
        status: 'ERROR',
        message: 'Erreur fatale lors du workflow manifeste Sénégal',
        erreur: error.message,
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar', 
          port: 'Port de Dakar'
        },
        timestamp: new Date().toISOString(),
        diagnostic: {
          manifesteLocal: manifeste ? '✅ CRÉÉ malgré l\'erreur' : '❌ NON CRÉÉ',
          transmissionKit: '❓ NON TESTÉ (erreur avant)',
          workflow_senegal: 'INTERROMPU'
        }
      };
      
      if (manifeste) {
        errorResponse.status = 'PARTIAL_SUCCESS';
        errorResponse.manifeste = {
          id: manifeste.id,
          numero_manif: manifeste.numero_manif || manifeste.numeroManifeste
        };
      }
      
      res.status(manifeste ? 206 : 500).json(errorResponse);
    }
  } else {
    res.status(405).json({ 
      erreur: 'Méthode non autorisée',
      methodesAutorisees: ['POST', 'OPTIONS'],
      paysTraitement: 'Sénégal - Port de Dakar'
    });
  }
};

// ✅ Fonctions utilitaires (identiques mais avec logs Sénégal)
function detecterFormatDonnees(donnees) {
    if (!donnees || typeof donnees !== 'object') return 'UNKNOWN';
    
    const champsUEMOA = ['annee_manif', 'bureau_manif', 'numero_manif', 'consignataire', 'articles'];
    const hasUEMOAFields = champsUEMOA.some(champ => donnees.hasOwnProperty(champ));
    
    if (hasUEMOAFields) return 'UEMOA';
    
    const champsLegacy = ['numeroManifeste', 'transporteur', 'marchandises'];
    const hasLegacyFields = champsLegacy.some(champ => donnees.hasOwnProperty(champ));
    
    return hasLegacyFields ? 'LEGACY' : 'UNKNOWN';
}

function nettoyerDonneesUEMOA(donnees) {
    console.log('🧹 [SÉNÉGAL] Nettoyage format UEMOA...');
    
    if (!donnees || typeof donnees !== 'object') {
        console.warn('⚠️ [SÉNÉGAL] Données UEMOA invalides');
        return {};
    }

    return {
        annee_manif: String(donnees.annee_manif || new Date().getFullYear()),
        bureau_manif: String(donnees.bureau_manif || '18N').trim(),
        numero_manif: parseInt(donnees.numero_manif) || Date.now(),
        code_cgt: String(donnees.code_cgt || '014').trim(),
        consignataire: String(donnees.consignataire || '').trim(),
        repertoire: String(donnees.repertoire || '02402').trim(),
        
        navire: String(donnees.navire || 'MARCO POLO').trim(),
        provenance: String(donnees.provenance || 'ROTTERDAM').trim(),
        pavillon: String(donnees.pavillon || 'LIBÉRIA').trim(),
        date_arrivee: donnees.date_arrivee || null,
        valapprox: parseFloat(donnees.valapprox) || 0,
        
        // ✅ Port de débarquement fixé pour Sénégal
        portDebarquement: 'Port de Dakar',
        paysOrigine: 'SEN',
        
        nbre_article: parseInt(donnees.nbre_article) || (donnees.articles ? donnees.articles.length : 0),
        articles: Array.isArray(donnees.articles) ? donnees.articles.map((article, index) => ({
            art: parseInt(article.art) || (index + 1),
            prec1: parseInt(article.prec1) || 0,
            prec2: parseInt(article.prec2) || 0,
            date_emb: article.date_emb || donnees.date_arrivee,
            lieu_emb: String(article.lieu_emb || donnees.provenance || 'Rotterdam').trim(),
            pays_dest: String(article.pays_dest || '').trim(),
            ville_dest: String(article.ville_dest || '').trim(),
            connaissement: String(article.connaissement || '').trim(),
            expediteur: String(article.expediteur || '').trim(),
            destinataire: String(article.destinataire || '').trim(),
            voie_dest: String(article.voie_dest || '').trim(),
            ordre: String(article.ordre || '').trim(),
            marchandise: String(article.marchandise || '').trim(),
            poids: parseFloat(article.poids) || 0,
            nbre_colis: parseInt(article.nbre_colis) || 1,
            marque: String(article.marque || 'NM').trim(),
            mode_cond: String(article.mode_cond || 'COLIS (PACKAGE)').trim(),
            nbre_conteneur: parseInt(article.nbre_conteneur) || 1,
            conteneurs: Array.isArray(article.conteneurs) ? article.conteneurs.map(cont => ({
                conteneur: String(cont.conteneur || '').trim(),
                type: String(cont.type || 'DRS').trim(),
                taille: String(cont.taille || '40').trim(),
                plomb: String(cont.plomb || '').trim()
            })) : []
        })) : []
    };
}

function nettoyerDonneesManifeste(donnees) {
    console.log('🧹 [SÉNÉGAL] Nettoyage format legacy...');
    
    if (!donnees || typeof donnees !== 'object') {
        console.warn('⚠️ [SÉNÉGAL] Données legacy invalides');
        return {};
    }

    const donneesNettoyees = {
        numeroManifeste: String(donnees.numeroManifeste || '').trim() || null,
        transporteur: String(donnees.transporteur || '').trim() || null,
        dateArrivee: donnees.dateArrivee || null,
        navire: String(donnees.navire || '').trim() || 'MARCO POLO',
        portEmbarquement: String(donnees.portEmbarquement || '').trim() || 'ROTTERDAM',
        portDebarquement: 'Port de Dakar', // ✅ Fixé pour Sénégal
        paysOrigine: 'SEN',
        marchandises: []
    };

    if (Array.isArray(donnees.marchandises) && donnees.marchandises.length > 0) {
        donneesNettoyees.marchandises = donnees.marchandises.map(marchandise => ({
            codeSH: String(marchandise.codeSH || '').trim() || '8703.21.10',
            designation: String(marchandise.designation || '').trim() || null,
            poidsBrut: parseFloat(marchandise.poidsBrut) || 0,
            nombreColis: parseInt(marchandise.nombreColis) || 1,
            destinataire: String(marchandise.destinataire || '').trim() || null,
            paysDestination: String(marchandise.paysDestination || '').trim() || null
        }));
    }

    return donneesNettoyees;
}

function validerDonneesManifeste(donnees, format) {
  const erreurs = [];

  console.log(`🔍 [SÉNÉGAL] Validation format ${format} pour Port de Dakar`);

  if (!donnees) {
    erreurs.push('Données manifeste manquantes pour traitement Sénégal');
    return erreurs;
  }

  if (format === 'UEMOA') {
    if (!donnees.numero_manif) {
      erreurs.push('numero_manif requis pour manifeste Sénégal');
    }
    
    if (!donnees.consignataire || typeof donnees.consignataire !== 'string' || donnees.consignataire.trim() === '') {
      erreurs.push('consignataire requis pour manifeste Sénégal');
    }
    
    if (!donnees.date_arrivee) {
      erreurs.push('date_arrivee requise pour manifeste Sénégal');
    }
    
    if (!donnees.articles || !Array.isArray(donnees.articles)) {
      erreurs.push('articles requis pour transmission depuis Sénégal');
    } else if (donnees.articles.length === 0) {
      erreurs.push('Au moins un article requis pour manifeste Sénégal');
    } else {
      donnees.articles.forEach((article, index) => {
        const prefix = `Article ${index + 1} (Sénégal)`;
        
        if (!article.pays_dest || typeof article.pays_dest !== 'string' || article.pays_dest.trim() === '') {
          erreurs.push(`${prefix}: pays_dest requis pour routage depuis Port de Dakar`);
        }
        
        if (!article.marchandise || typeof article.marchandise !== 'string' || article.marchandise.trim() === '') {
          erreurs.push(`${prefix}: marchandise requise pour manifeste Sénégal`);
        }
      });
    }
  }

  if (erreurs.length > 0) {
    console.error(`❌ [SÉNÉGAL] Validation ${format} échouée:`, erreurs);
  } else {
    console.log(`✅ [SÉNÉGAL] Validation ${format} réussie pour Port de Dakar`);
  }

  return erreurs;
}// ============================================================================
// PAYS A SÉNÉGAL - API Création Manifeste Corrigée
// Fichier: api/manifeste/creer.js - ÉTAPES 1-5 du workflow
// ============================================================================

const database = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Source-Country, X-Source-System');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    let manifeste = null;
    let transmissionKitReussie = false;
    let reponseKit = null;
    
    try {
      console.log('\n🇸🇳 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log('🇸🇳 [SÉNÉGAL] DÉBUT WORKFLOW LIBRE PRATIQUE - ÉTAPES 1-5');
      console.log('🇸🇳 [SÉNÉGAL] Port de Dakar → Pays de destination');
      console.log('🇸🇳 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log('📋 [SÉNÉGAL] Données reçues:', JSON.stringify(req.body, null, 2));

      // ✅ ÉTAPE 1 : Téléchargement manifeste d'entrée par consignataire
      console.log('📥 [SÉNÉGAL] ÉTAPE 1: Téléchargement manifeste d\'entrée...');
      
      const formatDetecte = detecterFormatDonnees(req.body);
      console.log(`🔍 [SÉNÉGAL] Format détecté: ${formatDetecte}`);

      let donneesNettoyees;
      if (formatDetecte === 'UEMOA') {
        donneesNettoyees = nettoyerDonneesUEMOA(req.body);
      } else {
        donneesNettoyees = nettoyerDonneesManifeste(req.body);
      }

      // ✅ Validation spécifique Sénégal
      const erreurs = validerDonneesManifeste(donneesNettoyees, formatDetecte);
      if (erreurs.length > 0) {
        console.error('❌ [SÉNÉGAL] Validation échouée:', erreurs);
        return res.status(400).json({
          status: 'ERROR',
          message: 'Validation échouée - données manifeste invalides',
          erreurs,
          paysTraitement: 'SÉNÉGAL',
          portTraitement: 'Port de Dakar',
          timestamp: new Date().toISOString()
        });
      }

      // ✅ ÉTAPES 2-3 : Renseignement et enregistrement informations marchandise
      console.log('💾 [SÉNÉGAL] ÉTAPES 2-3: Enregistrement informations marchandise...');
      manifeste = database.creerManifeste(donneesNettoyees);
      console.log(`✅ [SÉNÉGAL] ÉTAPES 1-3 COMPLÉTÉES: Manifeste ${manifeste.id} créé au Port de Dakar`);

      // ✅ ÉTAPE 4-5 : Transmission automatique vers Kit d'interconnexion
      console.log('\n🚀 [SÉNÉGAL] ═══ ÉTAPES 4-5: TRANSMISSION VERS KIT MULESOFT ═══');
      console.log(`🎯 [SÉNÉGAL] Extraction marchandises pour pays de destination`);
      console.log(`🔗 [SÉNÉGAL] URL Kit: ${kitClient.baseURL}/manifeste/transmission`);
      
      try {
        console.log(`⏳ [SÉNÉGAL] Transmission Kit MuleSoft en cours...`);
        const startTime = Date.now();
        
        reponseKit = await kitClient.transmettreManifeste(manifeste);
        const duration = Date.now() - startTime;
        
        transmissionKitReussie = true;
        console.log(`\n🎉 [SÉNÉGAL] ═══ ÉTAPES 4-5 RÉUSSIES ═══`);
        console.log(`✅ [SÉNÉGAL] Durée transmission: ${duration}ms`);
        console.log(`✅ [SÉNÉGAL] Status Kit: ${reponseKit?.status || 'N/A'}`);
        console.log(`✅ [SÉNÉGAL] Extraction transmise vers pays de destination`);
        console.log(`🎯 [SÉNÉGAL] ➤ Kit MuleSoft doit maintenant router vers le pays de destination`);
        
      } catch (kitError) {
        transmissionKitReussie = false;
        console.error(`\n💥 [SÉNÉGAL] ═══ ÉCHEC ÉTAPES 4-5 ═══`);
        console.error(`❌ [SÉNÉGAL] Erreur: ${kitError.message}`);
        console.error(`❌ [SÉNÉGAL] L'extraction n'a pas pu être transmise au pays de destination`);
        
        reponseKit = {
          status: 'ERROR',
          message: kitError.message,
          erreur: kitError.message,
          timestamp: new Date(),
          success: false
        };
      }

      // ✅ Enregistrement résultat transmission (mise à jour workflow)
      console.log('\n📝 [SÉNÉGAL] Mise à jour workflow manifeste...');
      try {
        database.enregistrerTransmissionKit(manifeste.id, reponseKit, transmissionKitReussie);
        console.log(`✅ [SÉNÉGAL] Workflow mis à jour: ${transmissionKitReussie ? 'TRANSMIS_VERS_DESTINATION' : 'ERREUR_TRANSMISSION'}`);
      } catch (dbError) {
        console.error(`❌ [SÉNÉGAL] Erreur mise à jour workflow:`, dbError);
      }

      // ✅ Réponse finale adaptée au workflow Sénégal
      const statusCode = transmissionKitReussie ? 200 : 206;
      const responseStatus = transmissionKitReussie ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      
      const reponse = {
        status: responseStatus,
        message: transmissionKitReussie 
          ? '🎉 Manifeste Sénégal créé et extraction transmise avec succès vers pays de destination'
          : '⚠️ Manifeste Sénégal créé au Port de Dakar, erreur transmission vers pays de destination',
        
        // ✅ Informations spécifiques Sénégal
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal', 
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        manifeste: {
          id: manifeste.id,
          numero_manif: manifeste.numero_manif,
          numeroManifeste: manifeste.numeroManifeste,
          consignataire: manifeste.consignataire,
          navire: manifeste.navire,
          provenance: manifeste.provenance,
          portDebarquement: manifeste.portDebarquement || 'Port de Dakar',
          formatOriginal: formatDetecte,
          nombreArticles: manifeste.nbre_article || manifeste.marchandises?.length || 0,
          statut: manifeste.statut,
          etapeWorkflow: manifeste.etapeWorkflow,
          dateCreation: manifeste.dateCreation,
          paysDestinations: (manifeste.articles || manifeste.marchandises || [])
            .map(item => item.pays_dest || item.paysDestination)
            .filter(Boolean)
        },
        
        workflow: {
          etapesCompletes: transmissionKitReussie ? '1-5' : '1-3',
          prochaine_etape: transmissionKitReussie ? 
            'Attente déclaration pays de destination (étapes 6-16)' :
            'Retry transmission vers Kit MuleSoft',
          statut_workflow: manifeste.etapeWorkflow,
          details_workflow: manifeste.workflow
        },
        
        transmissionKit: {
          urlKit: kitClient.baseURL + '/manifeste/transmission',
          reussie: transmissionKitReussie,
          timestamp: new Date().toISOString(),
          ...(transmissionKitReussie && reponseKit && {
            succes: {
              status: reponseKit.status || 'UNKNOWN',
              message: reponseKit.message || 'Extraction transmise vers pays de destination',
              correlationId: reponseKit.correlationId || null,
              latence: reponseKit.latence || reponseKit.metadata?.duration || 0,
              prochaine_etape: 'Routage vers pays de destination par Kit MuleSoft'
            }
          }),
          ...(reponseKit && !transmissionKitReussie && {
            echec: {
              erreur: reponseKit.erreur || reponseKit.message || 'Erreur inconnue',
              statusCode: reponseKit.statusCode || null,
              retryRecommended: reponseKit.retryRecommended || false,
              cause: 'Kit MuleSoft inaccessible ou erreur de traitement',
              impact: 'Pays de destination ne recevra pas l\'extraction du manifeste'
            }
          })
        },
        
        instructions: transmissionKitReussie ? [
          '✅ Manifeste enregistré au Port de Dakar (Sénégal)',
          '✅ Informations marchandise renseignées et stockées',
          '✅ Extraction transmise au Kit MuleSoft avec succès', 
          '🔄 Kit MuleSoft va router l\'extraction vers le pays de destination',
          '⏳ Attente traitement par le pays de destination (étapes 6-16)',
          '📋 Le Sénégal recevra les informations de déclaration/recouvrement (étape 17)'
        ] : [
          '✅ Manifeste enregistré au Port de Dakar (Sénégal)',
          '✅ Informations marchandise renseignées et stockées',
          '❌ Échec transmission extraction vers Kit MuleSoft',
          '⚠️ Le pays de destination ne recevra pas l\'extraction',
          '🔧 Vérifiez la connectivité Kit MuleSoft',
          '🔄 Réessayez la création ou contactez l\'administrateur'
        ],
        
        diagnostic: {
          formatDetecte,
          manifesteLocal: '✅ CRÉÉ au Port de Dakar',
          transmissionKit: transmissionKitReussie ? '✅ EXTRACTION TRANSMISE' : '❌ ÉCHEC TRANSMISSION',
          workflow_senegal: transmissionKitReussie ? 'ÉTAPES 1-5 TERMINÉES' : 'ÉTAPES 1-3 TERMINÉES',
          pays_destination: transmissionKitReussie ? '🔄 VA RECEVOIR EXTRACTION' : '❌ NE RECEVRA PAS EXTRACTION'
        },
        
        timestamp: new Date().toISOString()
      };

      console.log('\n🏁 [SÉNÉGAL] ═══════════════════════════════════════════════════════');
      console.log(`🏁 [SÉNÉGAL] WORKFLOW RÉSULTAT: ${responseStatus}`);
      console.log(`📋 [SÉNÉGAL] Manifeste: ${manifeste.id} - Port: Dakar - Kit: ${transmissionKitReussie ? 'OK' : 'KO'}`);
      console.log(`🎯 [SÉNÉGAL] Prochaines étapes: ${transmissionKitReussie ? 'Pays destination (6-16) puis retour Sénégal (17-19)' : 'Retry transmission Kit'}`);
      console.log('🏁 [SÉNÉGAL] ═══════════════════════════════════════════════════════');

      res.status(statusCode).json(reponse);
      
    } catch (error) {
      console.error('\n💥 [SÉNÉGAL] ═══ ERREUR FATALE WORKFLOW ═══');
      console.error('❌ [SÉNÉGAL] Erreur:', error.message);
      console.error('📋 [SÉNÉGAL] Port traitement: Port de Dakar');
      
      const errorResponse = {
        status: 'ERROR',
        message: 'Erreur fatale lors du workflow manifeste Sénégal',
        erreur: error.message,
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar', 
          port: 'Port de Dakar'
        },
        timestamp: new Date().toISOString(),
        diagnostic: {
          manifesteLocal: manifeste ? '✅ CRÉÉ malgré l\'erreur' : '❌ NON CRÉÉ',
          transmissionKit: '❓ NON TESTÉ (erreur avant)',
          workflow_senegal: 'INTERROMPU'
        }
      };
      
      if (manifeste) {
        errorResponse.status = 'PARTIAL_SUCCESS';
        errorResponse.manifeste = {
          id: manifeste.id,
          numero_manif: manifeste.numero_manif || manifeste.numeroManifeste
        };
      }
      
      res.status(manifeste ? 206 : 500).json(errorResponse);
    }
  } else {
    res.status(405).json({ 
      erreur: 'Méthode non autorisée',
      methodesAutorisees: ['POST', 'OPTIONS'],
      paysTraitement: 'Sénégal - Port de Dakar'
    });
  }
};

// ✅ Fonctions utilitaires (identiques mais avec logs Sénégal)
function detecterFormatDonnees(donnees) {
    if (!donnees || typeof donnees !== 'object') return 'UNKNOWN';
    
    const champsUEMOA = ['annee_manif', 'bureau_manif', 'numero_manif', 'consignataire', 'articles'];
    const hasUEMOAFields = champsUEMOA.some(champ => donnees.hasOwnProperty(champ));
    
    if (hasUEMOAFields) return 'UEMOA';
    
    const champsLegacy = ['numeroManifeste', 'transporteur', 'marchandises'];
    const hasLegacyFields = champsLegacy.some(champ => donnees.hasOwnProperty(champ));
    
    return hasLegacyFields ? 'LEGACY' : 'UNKNOWN';
}

function nettoyerDonneesUEMOA(donnees) {
    console.log('🧹 [SÉNÉGAL] Nettoyage format UEMOA...');
    
    if (!donnees || typeof donnees !== 'object') {
        console.warn('⚠️ [SÉNÉGAL] Données UEMOA invalides');
        return {};
    }

    return {
        annee_manif: String(donnees.annee_manif || new Date().getFullYear()),
        bureau_manif: String(donnees.bureau_manif || '18N').trim(),
        numero_manif: parseInt(donnees.numero_manif) || Date.now(),
        code_cgt: String(donnees.code_cgt || '014').trim(),
        consignataire: String(donnees.consignataire || '').trim(),
        repertoire: String(donnees.repertoire || '02402').trim(),
        
        navire: String(donnees.navire || 'MARCO POLO').trim(),
        provenance: String(donnees.provenance || 'ROTTERDAM').trim(),
        pavillon: String(donnees.pavillon || 'LIBÉRIA').trim(),
        date_arrivee: donnees.date_arrivee || null,
        valapprox: parseFloat(donnees.valapprox) || 0,
        
        // ✅ Port de débarquement fixé pour Sénégal
        portDebarquement: 'Port de Dakar',
        paysOrigine: 'SEN',
        
        nbre_article: parseInt(donnees.nbre_article) || (donnees.articles ? donnees.articles.length : 0),
        articles: Array.isArray(donnees.articles) ? donnees.articles.map((article, index) => ({
            art: parseInt(article.art) || (index + 1),
            prec1: parseInt(article.prec1) || 0,
            prec2: parseInt(article.prec2) || 0,
            date_emb: article.date_emb || donnees.date_arrivee,
            lieu_emb: String(article.lieu_emb || donnees.provenance || 'Rotterdam').trim(),
            pays_dest: String(article.pays_dest || '').trim(),
            ville_dest: String(article.ville_dest || '').trim(),
            connaissement: String(article.connaissement || '').trim(),
            expediteur: String(article.expediteur || '').trim(),
            destinataire: String(article.destinataire || '').trim(),
            voie_dest: String(article.voie_dest || '').trim(),
            ordre: String(article.ordre || '').trim(),
            marchandise: String(article.marchandise || '').trim(),
            poids: parseFloat(article.poids) || 0,
            nbre_colis: parseInt(article.nbre_colis) || 1,
            marque: String(article.marque || 'NM').trim(),
            mode_cond: String(article.mode_cond || 'COLIS (PACKAGE)').trim(),
            nbre_conteneur: parseInt(article.nbre_conteneur) || 1,
            conteneurs: Array.isArray(article.conteneurs) ? article.conteneurs.map(cont => ({
                conteneur: String(cont.conteneur || '').trim(),
                type: String(cont.type || 'DRS').trim(),
                taille: String(cont.taille || '40').trim(),
                plomb: String(cont.plomb || '').trim()
            })) : []
        })) : []
    };
}

function nettoyerDonneesManifeste(donnees) {
    console.log('🧹 [SÉNÉGAL] Nettoyage format legacy...');
    
    if (!donnees || typeof donnees !== 'object') {
        console.warn('⚠️ [SÉNÉGAL] Données legacy invalides');
        return {};
    }

    const donneesNettoyees = {
        numeroManifeste: String(donnees.numeroManifeste || '').trim() || null,
        transporteur: String(donnees.transporteur || '').trim() || null,
        dateArrivee: donnees.dateArrivee || null,
        navire: String(donnees.navire || '').trim() || 'MARCO POLO',
        portEmbarquement: String(donnees.portEmbarquement || '').trim() || 'ROTTERDAM',
        portDebarquement: 'Port de Dakar', // ✅ Fixé pour Sénégal
        paysOrigine: 'SEN',
        marchandises: []
    };

    if (Array.isArray(donnees.marchandises) && donnees.marchandises.length > 0) {
        donneesNettoyees.marchandises = donnees.marchandises.map(marchandise => ({
            codeSH: String(marchandise.codeSH || '').trim() || '8703.21.10',
            designation: String(marchandise.designation || '').trim() || null,
            poidsBrut: parseFloat(marchandise.poidsBrut) || 0,
            nombreColis: parseInt(marchandise.nombreColis) || 1,
            destinataire: String(marchandise.destinataire || '').trim() || null,
            paysDestination: String(marchandise.paysDestination || '').trim() || null
        }));
    }

    return donneesNettoyees;
}

function validerDonneesManifeste(donnees, format) {
  const erreurs = [];

  console.log(`🔍 [SÉNÉGAL] Validation format ${format} pour Port de Dakar`);

  if (!donnees) {
    erreurs.push('Données manifeste manquantes pour traitement Sénégal');
    return erreurs;
  }

  if (format === 'UEMOA') {
    if (!donnees.numero_manif) {
      erreurs.push('numero_manif requis pour manifeste Sénégal');
    }
    
    if (!donnees.consignataire || typeof donnees.consignataire !== 'string' || donnees.consignataire.trim() === '') {
      erreurs.push('consignataire requis pour manifeste Sénégal');
    }
    
    if (!donnees.date_arrivee) {
      erreurs.push('date_arrivee requise pour manifeste Sénégal');
    }
    
    if (!donnees.articles || !Array.isArray(donnees.articles)) {
      erreurs.push('articles requis pour transmission depuis Sénégal');
    } else if (donnees.articles.length === 0) {
      erreurs.push('Au moins un article requis pour manifeste Sénégal');
    } else {
      donnees.articles.forEach((article, index) => {
        const prefix = `Article ${index + 1} (Sénégal)`;
        
        if (!article.pays_dest || typeof article.pays_dest !== 'string' || article.pays_dest.trim() === '') {
          erreurs.push(`${prefix}: pays_dest requis pour routage depuis Port de Dakar`);
        }
        
        if (!article.marchandise || typeof article.marchandise !== 'string' || article.marchandise.trim() === '') {
          erreurs.push(`${prefix}: marchandise requise pour manifeste Sénégal`);
        }
      });
    }
  }

  if (erreurs.length > 0) {
    console.error(`❌ [SÉNÉGAL] Validation ${format} échouée:`, erreurs);
  } else {
    console.log(`✅ [SÉNÉGAL] Validation ${format} réussie pour Port de Dakar`);
  }

  return erreurs;
}