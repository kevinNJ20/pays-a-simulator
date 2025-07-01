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
      console.log('🎯 [PAYS A] DÉBUT CRÉATION MANIFESTE AVEC FOCUS KIT MULESOFT');
      console.log('🎯 [PAYS A] ═══════════════════════════════════════════════════════');
      console.log('📋 [PAYS A] Données reçues (RAW):', JSON.stringify(req.body, null, 2));

      // ✅ ÉTAPE 1: Nettoyage et normalisation des données d'entrée
      const donneesNettoyees = nettoyerDonneesManifeste(req.body);
      console.log('🧹 [PAYS A] Données nettoyées:', JSON.stringify(donneesNettoyees, null, 2));

      // ✅ ÉTAPE 2: Validation STRICTE mais robuste des données
      const erreurs = validerDonneesManifeste(donneesNettoyees);
      if (erreurs.length > 0) {
        console.error('❌ [PAYS A] Validation échouée - ARRÊT:', erreurs);
        return res.status(400).json({
          status: 'ERROR',
          message: 'Validation échouée - données manifeste invalides',
          erreurs,
          donneesRecues: req.body, // Pour debug
          timestamp: new Date().toISOString()
        });
      }

      // ✅ ÉTAPE 3: Création manifeste LOCAL (sauvegarde prioritaire)
      console.log('💾 [PAYS A] Création manifeste en base locale...');
      manifeste = database.creerManifeste(donneesNettoyees);
      console.log(`✅ [PAYS A] Manifeste ${manifeste.id} créé localement - SAUVEGARDÉ`);

      // ✅ ÉTAPE 4: TRANSMISSION CRITIQUE vers Kit MuleSoft avec données validées
      console.log('\n🚀 [PAYS A] ═══ TRANSMISSION VERS KIT MULESOFT ═══');
      console.log(`🎯 [PAYS A] OBJECTIF: Kit MuleSoft doit recevoir le manifeste pour insertion Supabase`);
      console.log(`📋 [PAYS A] Manifeste à transmettre: ${manifeste.numeroManifeste}`);
      console.log(`🔗 [PAYS A] URL Kit: ${kitClient.baseURL}/manifeste/transmission`);
      
      // ✅ Log critique des données avant transmission
      console.log('🔍 [PAYS A] Validation données avant Kit MuleSoft:');
      console.log(`   numeroManifeste: "${manifeste.numeroManifeste}" (type: ${typeof manifeste.numeroManifeste})`);
      console.log(`   transporteur: "${manifeste.transporteur}" (type: ${typeof manifeste.transporteur})`);
      console.log(`   marchandises: ${Array.isArray(manifeste.marchandises) ? manifeste.marchandises.length : 'NON ARRAY'} item(s)`);
      if (manifeste.marchandises && manifeste.marchandises[0]) {
        console.log(`   première marchandise paysDestination: "${manifeste.marchandises[0].paysDestination}"`);
      }
      
      try {
        // ✅ Transmission avec logging maximal
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
        
        // ✅ CORRECTION CRITIQUE: Créer un objet reponseKit sécurisé
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

      // ✅ ÉTAPE 5: Enregistrement résultat transmission (CRITIQUE pour statistiques)
      console.log('\n📝 [PAYS A] Enregistrement résultat transmission...');
      try {
        database.enregistrerTransmissionKit(manifeste.id, reponseKit, transmissionKitReussie);
        console.log(`✅ [PAYS A] Transmission Kit enregistrée: ${transmissionKitReussie ? 'SUCCÈS' : 'ÉCHEC'}`);
      } catch (dbError) {
        console.error(`❌ [PAYS A] Erreur enregistrement transmission:`, dbError);
      }

      // ✅ ÉTAPE 6: Mise à jour statistiques locales
      const statsFinales = database.obtenirStatistiques();
      console.log('\n📊 [PAYS A] Statistiques finales:', {
        manifestesCreees: statsFinales.manifestesCreees,
        transmissionsKit: statsFinales.transmissionsKit,
        transmissionsReussies: statsFinales.transmissionsReussies,
        tauxReussite: statsFinales.tauxReussiteTransmission
      });

      // ✅ ÉTAPE 7: Réponse avec diagnostic complet - ACCÈS SÉCURISÉS
      const statusCode = transmissionKitReussie ? 200 : 206; // 206 = Partial Success
      const responseStatus = transmissionKitReussie ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      
      const reponse = {
        status: responseStatus,
        message: transmissionKitReussie 
          ? '🎉 Manifeste créé et transmis au Kit MuleSoft avec succès'
          : '⚠️ Manifeste créé localement, transmission Kit MuleSoft échouée',
        
        manifeste: {
          id: manifeste.id,
          numeroManifeste: manifeste.numeroManifeste,
          transporteur: manifeste.transporteur,
          paysDestination: manifeste.marchandises?.[0]?.paysDestination,
          nombreMarchandises: manifeste.marchandises?.length || 0,
          statut: manifeste.statut,
          dateCreation: manifeste.dateCreation
        },
        
        // ✅ CORRECTION CRITIQUE: Diagnostic transmission avec accès ultra-sécurisés
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
        
        // ✅ Instructions selon le résultat
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
        
        // ✅ Diagnostic technique pour debug
        diagnostic: {
          manifesteLocal: '✅ CRÉÉ',
          kitMulesoft: transmissionKitReussie ? '✅ TRANSMIS' : '❌ ÉCHEC',
          supabaseUpdate: transmissionKitReussie ? '🔄 EN COURS (via Kit)' : '❌ BLOQUÉ',
          statistiquesLocales: '✅ MISES À JOUR'
        },
        
        timestamp: new Date().toISOString()
      };

      console.log('\n🏁 [PAYS A] ═══════════════════════════════════════════════════════');
      console.log(`🏁 [PAYS A] RÉSULTAT FINAL: ${responseStatus}`);
      console.log(`📋 [PAYS A] Manifeste: ${manifeste.id} - ${transmissionKitReussie ? 'Kit OK' : 'Kit KO'}`);
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
          numeroManifeste: manifeste.numeroManifeste
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

// ✅ FONCTION DE NETTOYAGE ET NORMALISATION DES DONNÉES
function nettoyerDonneesManifeste(donnees) {
  console.log('🧹 [PAYS A] Nettoyage des données d\'entrée...');
  
  if (!donnees || typeof donnees !== 'object') {
    console.warn('⚠️ [PAYS A] Données d\'entrée invalides, utilisation d\'un objet vide');
    return {};
  }

  // ✅ Nettoyage et normalisation des champs principaux
  const donneesNettoyees = {
    // ✅ Champs obligatoires avec nettoyage
    numeroManifeste: String(donnees.numeroManifeste || '').trim() || null,
    transporteur: String(donnees.transporteur || '').trim() || null,
    dateArrivee: donnees.dateArrivee || null,
    
    // ✅ Champs optionnels avec valeurs par défaut
    navire: String(donnees.navire || '').trim() || 'MARCO POLO',
    portEmbarquement: String(donnees.portEmbarquement || '').trim() || 'ROTTERDAM',
    portDebarquement: String(donnees.portDebarquement || '').trim() || 'ABIDJAN',
    
    // ✅ Marchandises avec nettoyage
    marchandises: []
  };

  // ✅ Traitement spécial pour les marchandises
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
    // ✅ Créer une marchandise à partir des champs racine pour compatibilité
    donneesNettoyees.marchandises = [{
      codeSH: String(donnees.codeSH || '').trim() || '8703.21.10',
      designation: String(donnees.designation || '').trim() || null,
      poidsBrut: parseFloat(donnees.poidsBrut) || 0,
      nombreColis: parseInt(donnees.nombreColis) || 1,
      destinataire: String(donnees.destinataire || '').trim() || null,
      paysDestination: String(donnees.paysDestination || '').trim() || null
    }];
  }

  console.log('✅ [PAYS A] Données nettoyées et normalisées:', {
    numeroManifeste: donneesNettoyees.numeroManifeste,
    transporteur: donneesNettoyees.transporteur,
    dateArrivee: donneesNettoyees.dateArrivee,
    marchandisesCount: donneesNettoyees.marchandises.length,
    premiereDestination: donneesNettoyees.marchandises[0]?.paysDestination
  });

  return donneesNettoyees;
}

// ✅ Validation stricte pour Kit MuleSoft avec messages d'erreur améliorés
function validerDonneesManifeste(donnees) {
  const erreurs = [];

  console.log('🔍 [PAYS A] Validation pour Kit MuleSoft:', {
    hasData: !!donnees,
    numeroManifeste: donnees?.numeroManifeste,
    transporteur: donnees?.transporteur,
    dateArrivee: donnees?.dateArrivee,
    marchandisesCount: donnees?.marchandises?.length
  });

  if (!donnees) {
    erreurs.push('Données manifeste complètement manquantes');
    return erreurs;
  }

  // ✅ Validation champs obligatoires pour Kit MuleSoft
  if (!donnees.numeroManifeste) {
    erreurs.push('numeroManifeste OBLIGATOIRE pour Kit MuleSoft - veuillez saisir un numéro de manifeste');
  } else if (typeof donnees.numeroManifeste !== 'string' || donnees.numeroManifeste.trim() === '') {
    erreurs.push('numeroManifeste doit être une chaîne non vide pour Kit MuleSoft');
  }

  if (!donnees.transporteur) {
    erreurs.push('transporteur OBLIGATOIRE pour Kit MuleSoft - veuillez saisir le nom du transporteur');
  } else if (typeof donnees.transporteur !== 'string' || donnees.transporteur.trim() === '') {
    erreurs.push('transporteur doit être une chaîne non vide pour Kit MuleSoft');
  }

  if (!donnees.dateArrivee) {
    erreurs.push('dateArrivee OBLIGATOIRE pour Kit MuleSoft - veuillez sélectionner une date');
  } else {
    const dateArrivee = new Date(donnees.dateArrivee);
    if (isNaN(dateArrivee.getTime())) {
      erreurs.push('Format dateArrivee invalide pour Kit MuleSoft - format attendu: YYYY-MM-DD');
    }
  }

  // ✅ Validation marchandises CRITIQUE pour Kit MuleSoft
  if (!donnees.marchandises || !Array.isArray(donnees.marchandises)) {
    erreurs.push('marchandises doit être un tableau pour Kit MuleSoft');
  } else if (donnees.marchandises.length === 0) {
    erreurs.push('Au moins une marchandise OBLIGATOIRE pour Kit MuleSoft');
  } else {
    donnees.marchandises.forEach((marchandise, index) => {
      const prefix = `Marchandise ${index + 1} (Kit MuleSoft)`;
      
      // paysDestination OBLIGATOIRE pour routing Kit
      if (!marchandise.paysDestination) {
        erreurs.push(`${prefix}: paysDestination OBLIGATOIRE pour routing Kit MuleSoft - veuillez sélectionner le pays de destination`);
      } else if (typeof marchandise.paysDestination !== 'string' || marchandise.paysDestination.trim() === '') {
        erreurs.push(`${prefix}: paysDestination doit être une chaîne non vide pour Kit MuleSoft`);
      }
      
      // designation obligatoire
      if (!marchandise.designation) {
        erreurs.push(`${prefix}: designation OBLIGATOIRE pour Kit MuleSoft - veuillez saisir la description de la marchandise`);
      } else if (typeof marchandise.designation !== 'string' || marchandise.designation.trim() === '') {
        erreurs.push(`${prefix}: designation doit être une chaîne non vide pour Kit MuleSoft`);
      }
      
      // poidsBrut doit être numérique
      if (marchandise.poidsBrut !== undefined && (isNaN(parseFloat(marchandise.poidsBrut)) || parseFloat(marchandise.poidsBrut) <= 0)) {
        erreurs.push(`${prefix}: poidsBrut doit être un nombre positif pour Kit MuleSoft`);
      }
      
      // nombreColis doit être entier positif
      if (marchandise.nombreColis !== undefined && (isNaN(parseInt(marchandise.nombreColis)) || parseInt(marchandise.nombreColis) <= 0)) {
        erreurs.push(`${prefix}: nombreColis doit être un entier positif pour Kit MuleSoft`);
      }
    });
  }

  if (erreurs.length > 0) {
    console.error(`❌ [PAYS A] Validation Kit MuleSoft échouée (${erreurs.length} erreurs):`, erreurs);
  } else {
    console.log(`✅ [PAYS A] Validation Kit MuleSoft réussie - Prêt pour transmission`);
  }

  return erreurs;
}