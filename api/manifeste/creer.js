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
    try {
      console.log('📋 [Pays A] Nouvelle demande création manifeste:', req.body?.numeroManifeste);
      console.log('📋 [Pays A] Données reçues:', JSON.stringify(req.body, null, 2));

      // Validation des données
      const erreurs = validerDonneesManifeste(req.body);
      if (erreurs.length > 0) {
        console.error('❌ [Pays A] Validation échouée:', erreurs);
        return res.status(400).json({
          status: 'ERROR',
          message: 'Données manifeste invalides',
          erreurs,
          timestamp: new Date().toISOString()
        });
      }

      // Étape 1: Créer le manifeste localement TOUJOURS
      const manifeste = database.creerManifeste(req.body);
      console.log(`✅ [Pays A] Manifeste créé localement: ${manifeste.id}`);
      console.log(`📊 [Pays A] Manifeste créé:`, JSON.stringify(manifeste, null, 2));

      // Étape 2: Transmettre DIRECTEMENT au Kit MuleSoft
      let transmissionReussie = false;
      let reponseKit = null;
      let erreurTransmission = null;

      try {
        console.log(`🚀 [Pays A] Début transmission DIRECTE vers Kit MuleSoft: ${manifeste.id}`);
        
        // ✅ CORRECTION: Appel direct vers MuleSoft avec timeout plus long
        const startTime = Date.now();
        reponseKit = await Promise.race([
          kitClient.transmettreManifeste(manifeste),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout transmission Kit MuleSoft > 45s')), 45000)
          )
        ]);
        const duration = Date.now() - startTime;
        reponseKit.latence = duration;
        
        transmissionReussie = true;
        
        console.log(`✅ [Pays A] Transmission Kit MuleSoft réussie (${duration}ms):`, {
          manifesteId: manifeste.id,
          kitResponse: reponseKit.status,
          latence: reponseKit.latence,
          correlationId: reponseKit.correlationId
        });
        
      } catch (error) {
        console.error(`❌ [Pays A] Erreur transmission Kit MuleSoft:`, {
          manifesteId: manifeste.id,
          erreur: error.message,
          stack: error.stack,
          details: error.response?.data || error.cause
        });
        erreurTransmission = error.message;
        transmissionReussie = false;
        
        // ✅ AMÉLIORATION: Enregistrer l'erreur avec plus de détails
        reponseKit = {
          status: 'ERROR',
          message: error.message,
          erreur: error.message,
          timestamp: new Date(),
          latence: 0
        };
      }

      // Étape 3: Enregistrer le résultat de la transmission TOUJOURS
      try {
        database.enregistrerTransmissionKit(
          manifeste.id, 
          reponseKit || { erreur: erreurTransmission }, 
          transmissionReussie
        );
        console.log(`📝 [Pays A] Transmission Kit enregistrée pour manifeste ${manifeste.id}`);
      } catch (dbError) {
        console.error(`❌ [Pays A] Erreur enregistrement transmission:`, dbError);
        // Continue même si l'enregistrement échoue
      }

      // ✅ CORRECTION: Mettre à jour les statistiques TOUJOURS
      try {
        const statsUpdated = database.obtenirStatistiques();
        console.log(`📊 [Pays A] Statistiques mises à jour:`, {
          manifestesCreees: statsUpdated.manifestesCreees,
          transmissionsKit: statsUpdated.transmissionsKit,
          transmissionsReussies: statsUpdated.transmissionsReussies
        });
      } catch (statsError) {
        console.error(`❌ [Pays A] Erreur mise à jour statistiques:`, statsError);
      }

      // Étape 4: Préparer la réponse
      const reponse = {
        status: transmissionReussie ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        message: transmissionReussie 
          ? 'Manifeste créé et transmis au Kit MuleSoft avec succès'
          : 'Manifeste créé mais erreur de transmission au Kit MuleSoft',
        
        manifeste: {
          id: manifeste.id,
          numeroManifeste: manifeste.numeroManifeste,
          transporteur: manifeste.transporteur,
          paysDestination: manifeste.marchandises?.[0]?.paysDestination,
          nombreMarchandises: manifeste.marchandises?.length || 0,
          statut: manifeste.statut,
          dateCreation: manifeste.dateCreation
        },
        
        // ✅ CORRECTION: Informations détaillées sur la transmission MuleSoft
        transmission: {
          vers: 'Kit MuleSoft (Direct)',
          urlKit: kitClient.baseURL,
          reussie: transmissionReussie,
          timestamp: new Date().toISOString(),
          latence: reponseKit?.latence || null,
          correlationId: reponseKit?.correlationId || null,
          ...(reponseKit && transmissionReussie && { 
            reponseKit: {
              status: reponseKit.status,
              message: reponseKit.message,
              timestamp: reponseKit.timestamp
            }
          }),
          ...(erreurTransmission && { 
            erreur: erreurTransmission,
            detailsErreur: reponseKit,
            recommandation: 'Vérifiez la connectivité avec Kit MuleSoft et les logs détaillés'
          })
        },
        
        prochainEtapes: transmissionReussie ? [
          'Le manifeste a été routé vers le pays de destination via Kit MuleSoft',
          'La Commission UEMOA a été notifiée automatiquement',
          'Attente de traitement par le pays destinataire',
          'Vous recevrez une autorisation de mainlevée après paiement'
        ] : [
          'Le manifeste est sauvegardé localement dans le système Pays A',
          'Tentative de retransmission vers Kit MuleSoft recommandée',
          'Vérifiez la connectivité réseau et le statut du Kit',
          'Contactez l\'administrateur si le problème persiste'
        ],
        
        timestamp: new Date().toISOString()
      };

      const statusCode = transmissionReussie ? 200 : 206; // 206 = Partial Content
      res.status(statusCode).json(reponse);

      // Log pour monitoring avec détails Kit
      console.log(`📊 [Pays A] Résumé transmission manifeste ${manifeste.id}:`, {
        local: '✅ SAUVEGARDE',
        kitMulesoft: transmissionReussie ? '✅ TRANSMIS' : '❌ ECHEC',
        latence: reponseKit?.latence || 'N/A',
        destination: manifeste.marchandises?.[0]?.paysDestination,
        erreur: erreurTransmission || 'N/A'
      });
      
    } catch (error) {
      console.error('❌ [Pays A] Erreur création manifeste:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur interne lors de la création du manifeste',
        erreur: error.message,
        recommandation: 'Vérifiez les logs serveur et la connectivité Kit MuleSoft',
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

// Validation des données manifeste (améliorée avec logging)
function validerDonneesManifeste(donnees) {
  const erreurs = [];

  console.log('🔍 [Pays A] Validation manifeste:', {
    hasData: !!donnees,
    numeroManifeste: donnees?.numeroManifeste,
    transporteur: donnees?.transporteur,
    marchandisesCount: donnees?.marchandises?.length
  });

  if (!donnees.numeroManifeste || donnees.numeroManifeste.trim() === '') {
    erreurs.push('Le numéro de manifeste est requis');
  }

  if (!donnees.transporteur || donnees.transporteur.trim() === '') {
    erreurs.push('Le transporteur est requis');
  }

  if (!donnees.dateArrivee) {
    erreurs.push('La date d\'arrivée est requise');
  }

  if (!donnees.marchandises || !Array.isArray(donnees.marchandises) || donnees.marchandises.length === 0) {
    erreurs.push('Au moins une marchandise est requise');
  } else {
    donnees.marchandises.forEach((marchandise, index) => {
      if (!marchandise.paysDestination) {
        erreurs.push(`Pays de destination requis pour la marchandise ${index + 1}`);
      }
      if (!marchandise.designation) {
        erreurs.push(`Désignation requise pour la marchandise ${index + 1}`);
      }
      if (!marchandise.poidsBrut || marchandise.poidsBrut <= 0) {
        erreurs.push(`Poids brut valide requis pour la marchandise ${index + 1}`);
      }
    });
  }

  // Log des erreurs de validation
  if (erreurs.length > 0) {
    console.log(`⚠️ [Pays A] Validation manifeste échouée:`, erreurs);
  } else {
    console.log(`✅ [Pays A] Validation manifeste réussie`);
  }

  return erreurs;
}