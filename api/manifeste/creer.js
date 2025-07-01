// ============================================================================
// CORRECTION BACKEND : api/manifeste/creer.js
// Remplacer la fonction principale dans api/manifeste/creer.js
// ============================================================================

const database = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    let manifeste = null;
    let transmissionKitReussie = false;
    let reponseKit = null;
    
    try {
      console.log('\n🎯 [PAYS A] ═══════════════════════════════════════════════════════');
      console.log('🎯 [PAYS A] DÉBUT CRÉATION MANIFESTE FORMAT UEMOA DIRECT');
      console.log('🎯 [PAYS A] ═══════════════════════════════════════════════════════');
      console.log('📋 [PAYS A] Données reçues (RAW):', JSON.stringify(req.body, null, 2));

      // ✅ CORRECTION MAJEURE : Détecter le format reçu
      const formatDetecte = detecterFormatDonnees(req.body);
      console.log(`🔍 [PAYS A] Format détecté: ${formatDetecte}`);

      let donneesNettoyees;
      
      if (formatDetecte === 'UEMOA') {
        // ✅ NOUVEAU : Traitement direct du format UEMOA
        console.log('✅ [PAYS A] Format UEMOA détecté - Traitement direct');
        donneesNettoyees = nettoyerDonneesUEMOA(req.body);
      } else {
        // ✅ Traitement legacy (ancien code conservé pour compatibilité)
        console.log('🔄 [PAYS A] Format legacy détecté - Conversion vers UEMOA');
        donneesNettoyees = nettoyerDonneesManifeste(req.body);
      }

      console.log('🧹 [PAYS A] Données nettoyées:', JSON.stringify(donneesNettoyees, null, 2));

      // ✅ VALIDATION UNIFIÉE
      const erreurs = validerDonneesManifeste(donneesNettoyees, formatDetecte);
      if (erreurs.length > 0) {
        console.error('❌ [PAYS A] Validation échouée - ARRÊT:', erreurs);
        return res.status(400).json({
          status: 'ERROR',
          message: 'Validation échouée - données manifeste invalides',
          erreurs,
          formatDetecte,
          donneesRecues: req.body,
          timestamp: new Date().toISOString()
        });
      }

      // ✅ Création manifeste LOCAL
      console.log('💾 [PAYS A] Création manifeste en base locale...');
      manifeste = database.creerManifeste(donneesNettoyees);
      console.log(`✅ [PAYS A] Manifeste ${manifeste.id} créé localement - SAUVEGARDÉ`);

      // ✅ TRANSMISSION vers Kit MuleSoft
      console.log('\n🚀 [PAYS A] ═══ TRANSMISSION VERS KIT MULESOFT ═══');
      console.log(`🎯 [PAYS A] OBJECTIF: Kit MuleSoft doit recevoir le manifeste pour insertion Supabase`);
      console.log(`📋 [PAYS A] Manifeste à transmettre: ${manifeste.numero_manif || manifeste.numeroManifeste}`);
      console.log(`🔗 [PAYS A] URL Kit: ${kitClient.baseURL}/manifeste/transmission`);
      
      try {
        console.log(`⏳ [PAYS A] Appel Kit MuleSoft en cours...`);
        const startTime = Date.now();
        
        reponseKit = await kitClient.transmettreManifeste(manifeste);
        const duration = Date.now() - startTime;
        
        transmissionKitReussie = true;
        console.log(`\n🎉 [PAYS A] ═══ TRANSMISSION KIT MULESOFT RÉUSSIE ═══`);
        console.log(`✅ [PAYS A] Durée: ${duration}ms`);
        console.log(`✅ [PAYS A] Status Kit: ${reponseKit?.status || 'N/A'}`);
        console.log(`✅ [PAYS A] Corrélation: ${reponseKit?.correlationId || 'N/A'}`);
        console.log(`📋 [PAYS A] Réponse Kit:`, JSON.stringify(reponseKit, null, 2));
        console.log(`🎯 [PAYS A] ➤ Kit MuleSoft devrait maintenant insérer dans Supabase`);
        
      } catch (kitError) {
        transmissionKitReussie = false;
        console.error(`\n💥 [PAYS A] ═══ ÉCHEC TRANSMISSION KIT MULESOFT ═══`);
        console.error(`❌ [PAYS A] Erreur: ${kitError.message}`);
        console.error(`❌ [PAYS A] Status Code: ${kitError.statusCode || 'N/A'}`);
        console.error(`❌ [PAYS A] Retry recommandé: ${kitError.retryRecommended ? 'OUI' : 'NON'}`);
        console.error(`❌ [PAYS A] URL Kit: ${kitError.kitUrl || 'N/A'}`);
        console.error(`🚨 [PAYS A] ➤ Supabase NE SERA PAS mis à jour car Kit MuleSoft inaccessible`);
        
        reponseKit = {
          status: 'ERROR',
          message: kitError.message,
          erreur: kitError.message,
          timestamp: new Date(),
          statusCode: kitError.statusCode || null,
          retryRecommended: kitError.retryRecommended || false,
          originalError: kitError.originalError?.message || null,
          latence: 0,
          correlationId: null,
          success: false
        };
      }

      // ✅ Enregistrement résultat transmission
      console.log('\n📝 [PAYS A] Enregistrement résultat transmission...');
      try {
        database.enregistrerTransmissionKit(manifeste.id, reponseKit, transmissionKitReussie);
        console.log(`✅ [PAYS A] Transmission Kit enregistrée: ${transmissionKitReussie ? 'SUCCÈS' : 'ÉCHEC'}`);
      } catch (dbError) {
        console.error(`❌ [PAYS A] Erreur enregistrement transmission:`, dbError);
      }

      // ✅ Réponse finale
      const statusCode = transmissionKitReussie ? 200 : 206;
      const responseStatus = transmissionKitReussie ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      
      const reponse = {
        status: responseStatus,
        message: transmissionKitReussie 
          ? '🎉 Manifeste UEMOA créé et transmis au Kit MuleSoft avec succès'
          : '⚠️ Manifeste UEMOA créé localement, transmission Kit MuleSoft échouée',
        
        manifeste: {
          id: manifeste.id,
          numero_manif: manifeste.numero_manif,
          numeroManifeste: manifeste.numeroManifeste, // Compatibilité
          consignataire: manifeste.consignataire,
          transporteur: manifeste.transporteur, // Compatibilité
          navire: manifeste.navire,
          formatOriginal: formatDetecte,
          nombreArticles: manifeste.nbre_article || manifeste.marchandises?.length || 0,
          statut: manifeste.statut,
          dateCreation: manifeste.dateCreation
        },
        
        transmissionKit: {
          urlKit: kitClient.baseURL + '/manifeste/transmission',
          reussie: transmissionKitReussie,
          timestamp: new Date().toISOString(),
          ...(transmissionKitReussie && reponseKit && {
            succes: {
              status: reponseKit.status || 'UNKNOWN',
              message: reponseKit.message || 'Message non disponible',
              correlationId: reponseKit.correlationId || null,
              latence: reponseKit.latence || reponseKit.metadata?.duration || 0,
              supabaseUpdate: 'Kit MuleSoft devrait insérer dans Supabase'
            }
          }),
          ...(reponseKit && !transmissionKitReussie && {
            echec: {
              erreur: reponseKit.erreur || reponseKit.message || 'Erreur inconnue',
              statusCode: reponseKit.statusCode || null,
              retryRecommended: reponseKit.retryRecommended || false,
              cause: 'Kit MuleSoft inaccessible ou erreur de traitement',
              impact: 'Supabase ne sera PAS mis à jour',
              latence: reponseKit.latence || 0
            }
          })
        },
        
        instructions: transmissionKitReussie ? [
          '✅ Manifeste sauvegardé localement dans Pays A',
          '✅ Manifeste transmis au Kit MuleSoft avec succès',
          '🔄 Kit MuleSoft va insérer les données dans Supabase',
          '📡 Kit MuleSoft va router vers le pays de destination',
          '📊 Commission UEMOA sera notifiée automatiquement'
        ] : [
          '✅ Manifeste sauvegardé localement dans Pays A',
          '❌ Transmission Kit MuleSoft échouée',
          '🚨 Supabase ne sera pas mis à jour pour ce manifeste',
          '🔧 Vérifiez la connectivité vers Kit MuleSoft',
          '🔄 Réessayez la création ou contactez l\'administrateur'
        ],
        
        diagnostic: {
          formatDetecte,
          manifesteLocal: '✅ CRÉÉ',
          kitMulesoft: transmissionKitReussie ? '✅ TRANSMIS' : '❌ ÉCHEC',
          supabaseUpdate: transmissionKitReussie ? '🔄 EN COURS (via Kit)' : '❌ BLOQUÉ',
          statistiquesLocales: '✅ MISES À JOUR'
        },
        
        timestamp: new Date().toISOString()
      };

      console.log('\n🏁 [PAYS A] ═══════════════════════════════════════════════════════');
      console.log(`🏁 [PAYS A] RÉSULTAT FINAL: ${responseStatus}`);
      console.log(`📋 [PAYS A] Manifeste: ${manifeste.id} - Format: ${formatDetecte} - Kit: ${transmissionKitReussie ? 'OK' : 'KO'}`);
      console.log(`🎯 [PAYS A] Supabase: ${transmissionKitReussie ? 'Sera mis à jour par Kit' : 'Ne sera PAS mis à jour'}`);
      console.log('🏁 [PAYS A] ═══════════════════════════════════════════════════════');

      res.status(statusCode).json(reponse);
      
    } catch (error) {
      console.error('\n💥 [PAYS A] ═══ ERREUR FATALE CRÉATION MANIFESTE ═══');
      console.error('❌ [PAYS A] Erreur:', error.message);
      console.error('❌ [PAYS A] Stack:', error.stack);
      console.error('📋 [PAYS A] Request Body:', JSON.stringify(req.body, null, 2));
      console.error('📊 [PAYS A] Manifeste créé:', !!manifeste);
      
      const errorResponse = {
        status: 'ERROR',
        message: 'Erreur fatale lors de la création du manifeste',
        erreur: error.message,
        timestamp: new Date().toISOString(),
        diagnostic: {
          manifesteLocal: manifeste ? '✅ CRÉÉ malgré l\'erreur' : '❌ NON CRÉÉ',
          kitMulesoft: '❓ NON TESTÉ (erreur avant)',
          supabaseUpdate: '❌ IMPOSSIBLE'
        }
      };
      
      // Si manifeste créé malgré l'erreur, le signaler
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
      methodesAutorisees: ['POST', 'OPTIONS']
    });
  }
};

// ✅ NOUVELLE FONCTION : Détecter le format des données reçues
function detecterFormatDonnees(donnees) {
    if (!donnees || typeof donnees !== 'object') return 'UNKNOWN';
    
    // Vérifier si c'est le format UEMOA
    const champsUEMOA = ['annee_manif', 'bureau_manif', 'numero_manif', 'consignataire', 'articles'];
    const hasUEMOAFields = champsUEMOA.some(champ => donnees.hasOwnProperty(champ));
    
    if (hasUEMOAFields) {
        return 'UEMOA';
    }
    
    // Vérifier si c'est le format legacy
    const champsLegacy = ['numeroManifeste', 'transporteur', 'marchandises'];
    const hasLegacyFields = champsLegacy.some(champ => donnees.hasOwnProperty(champ));
    
    if (hasLegacyFields) {
        return 'LEGACY';
    }
    
    return 'UNKNOWN';
}

// ✅ NOUVELLE FONCTION : Nettoyage spécifique format UEMOA
function nettoyerDonneesUEMOA(donnees) {
    console.log('🧹 [PAYS A] Nettoyage format UEMOA...');
    
    if (!donnees || typeof donnees !== 'object') {
        console.warn('⚠️ [PAYS A] Données UEMOA invalides, utilisation d\'un objet vide');
        return {};
    }

    return {
        // ✅ Champs UEMOA obligatoires
        annee_manif: String(donnees.annee_manif || new Date().getFullYear()),
        bureau_manif: String(donnees.bureau_manif || '18N').trim(),
        numero_manif: parseInt(donnees.numero_manif) || Date.now(),
        code_cgt: String(donnees.code_cgt || '014').trim(),
        consignataire: String(donnees.consignataire || '').trim(),
        repertoire: String(donnees.repertoire || '02402').trim(),
        
        // ✅ Informations navire
        navire: String(donnees.navire || 'MARCO POLO').trim(),
        provenance: String(donnees.provenance || 'ROTTERDAM').trim(),
        pavillon: String(donnees.pavillon || 'LIBÉRIA').trim(),
        date_arrivee: donnees.date_arrivee || null,
        valapprox: parseFloat(donnees.valapprox) || 0,
        
        // ✅ Articles
        nbre_article: parseInt(donnees.nbre_article) || (donnees.articles ? donnees.articles.length : 0),
        articles: Array.isArray(donnees.articles) ? donnees.articles.map(article => ({
            art: parseInt(article.art) || 1,
            prec1: parseInt(article.prec1) || 0,
            prec2: parseInt(article.prec2) || 0,
            date_emb: article.date_emb || donnees.date_arrivee,
            lieu_emb: String(article.lieu_emb || '').trim(),
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

// ✅ FONCTION DE NETTOYAGE LEGACY (conservée pour compatibilité)
function nettoyerDonneesManifeste(donnees) {
    console.log('🧹 [PAYS A] Nettoyage des données legacy...');
    
    if (!donnees || typeof donnees !== 'object') {
        console.warn('⚠️ [PAYS A] Données legacy invalides, utilisation d\'un objet vide');
        return {};
    }

    const donneesNettoyees = {
        numeroManifeste: String(donnees.numeroManifeste || '').trim() || null,
        transporteur: String(donnees.transporteur || '').trim() || null,
        dateArrivee: donnees.dateArrivee || null,
        navire: String(donnees.navire || '').trim() || 'MARCO POLO',
        portEmbarquement: String(donnees.portEmbarquement || '').trim() || 'ROTTERDAM',
        portDebarquement: String(donnees.portDebarquement || '').trim() || 'ABIDJAN',
        marchandises: []
    };

    if (Array.isArray(donnees.marchandises) && donnees.marchandises.length > 0) {
        donneesNettoyees.marchandises = donnees.marchandises.map((marchandise, index) => ({
            codeSH: String(marchandise.codeSH || '').trim() || '8703.21.10',
            designation: String(marchandise.designation || '').trim() || null,
            poidsBrut: parseFloat(marchandise.poidsBrut) || 0,
            nombreColis: parseInt(marchandise.nombreColis) || 1,
            destinataire: String(marchandise.destinataire || '').trim() || null,
            paysDestination: String(marchandise.paysDestination || '').trim() || null
        }));
    } else {
        donneesNettoyees.marchandises = [{
            codeSH: String(donnees.codeSH || '').trim() || '8703.21.10',
            designation: String(donnees.designation || '').trim() || null,
            poidsBrut: parseFloat(donnees.poidsBrut) || 0,
            nombreColis: parseInt(donnees.nombreColis) || 1,
            destinataire: String(donnees.destinataire || '').trim() || null,
            paysDestination: String(donnees.paysDestination || '').trim() || null
        }];
    }

    return donneesNettoyees;
}

// ✅ VALIDATION UNIFIÉE pour UEMOA et Legacy
function validerDonneesManifeste(donnees, format) {
  const erreurs = [];

  console.log(`🔍 [PAYS A] Validation format ${format}:`, {
    hasData: !!donnees,
    dataKeys: donnees ? Object.keys(donnees) : []
  });

  if (!donnees) {
    erreurs.push('Données manifeste complètement manquantes');
    return erreurs;
  }

  if (format === 'UEMOA') {
    // ✅ Validation format UEMOA
    console.log('🔍 [PAYS A] Validation UEMOA:', {
      numero_manif: donnees.numero_manif,
      consignataire: donnees.consignataire,
      date_arrivee: donnees.date_arrivee,
      articles: donnees.articles?.length
    });
    
    if (!donnees.numero_manif) {
      erreurs.push('numero_manif requis pour Kit MuleSoft UEMOA - veuillez saisir un numéro de manifeste');
    }
    
    if (!donnees.consignataire || typeof donnees.consignataire !== 'string' || donnees.consignataire.trim() === '') {
      erreurs.push('consignataire requis pour Kit MuleSoft UEMOA - veuillez vérifier le champ consignataire');
    }
    
    if (!donnees.date_arrivee) {
      erreurs.push('date_arrivee requis pour Kit MuleSoft UEMOA - veuillez sélectionner une date');
    }
    
    if (!donnees.articles || !Array.isArray(donnees.articles)) {
      erreurs.push('articles doit être un tableau pour Kit MuleSoft UEMOA');
    } else if (donnees.articles.length === 0) {
      erreurs.push('Au moins un article requis pour Kit MuleSoft UEMOA');
    } else {
      donnees.articles.forEach((article, index) => {
        const prefix = `Article ${index + 1} (UEMOA)`;
        
        if (!article.pays_dest || typeof article.pays_dest !== 'string' || article.pays_dest.trim() === '') {
          erreurs.push(`${prefix}: pays_dest requis pour routing Kit MuleSoft - veuillez sélectionner le pays de destination`);
        }
        
        if (!article.marchandise || typeof article.marchandise !== 'string' || article.marchandise.trim() === '') {
          erreurs.push(`${prefix}: marchandise requise pour Kit MuleSoft - veuillez saisir la description de la marchandise`);
        }
      });
    }
    
  } else {
    // ✅ Validation format legacy (code existant)
    const numeroManifeste = donnees.numeroManifeste;
    if (!numeroManifeste) {
      erreurs.push('numeroManifeste requis pour Kit MuleSoft - veuillez vérifier le champ numéro de manifeste');
    }
    
    if (!donnees.transporteur || typeof donnees.transporteur !== 'string' || donnees.transporteur.trim() === '') {
      erreurs.push('transporteur requis pour Kit MuleSoft - veuillez vérifier le champ transporteur');
    }
    
    if (!donnees.marchandises || !Array.isArray(donnees.marchandises)) {
      erreurs.push('marchandises doit être un tableau pour Kit MuleSoft');
    } else if (donnees.marchandises.length === 0) {
      erreurs.push('Au moins une marchandise requise pour Kit MuleSoft');
    } else {
      donnees.marchandises.forEach((marchandise, index) => {
        const prefix = `Marchandise ${index + 1}`;
        
        if (!marchandise.paysDestination || typeof marchandise.paysDestination !== 'string' || marchandise.paysDestination.trim() === '') {
          erreurs.push(`${prefix}: paysDestination requis pour routing Kit MuleSoft`);
        }
        
        if (!marchandise.designation || typeof marchandise.designation !== 'string' || marchandise.designation.trim() === '') {
          erreurs.push(`${prefix}: designation requise pour Kit MuleSoft`);
        }
      });
    }
  }

  if (erreurs.length > 0) {
    console.error(`❌ [PAYS A] Validation ${format} échouée (${erreurs.length} erreurs):`, erreurs);
  } else {
    console.log(`✅ [PAYS A] Validation ${format} réussie - Prêt pour transmission`);
  }

  return erreurs;
}