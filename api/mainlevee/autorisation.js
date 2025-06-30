const database = require('../../lib/database');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID, X-Authorization-Source');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      console.log('🔓 [Pays A] Réception autorisation mainlevée depuis Kit MuleSoft:', req.body);
      
      // ✅ CORRECTION: Extraire les données d'autorisation du Kit MuleSoft
      const donneesAutorisation = req.body.autorisationMainlevee || req.body;
      
      // Validation
      if (!donneesAutorisation.numeroManifeste) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Numéro de manifeste requis pour l\'autorisation',
          timestamp: new Date().toISOString()
        });
      }

      // Vérifier que le manifeste existe
      const manifeste = database.obtenirManifeste(donneesAutorisation.numeroManifeste);
      if (!manifeste) {
        console.log(`⚠️ [Pays A] Manifeste introuvable: ${donneesAutorisation.numeroManifeste}`);
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Manifeste ${donneesAutorisation.numeroManifeste} non trouvé`,
          timestamp: new Date().toISOString()
        });
      }

      // Enregistrer l'autorisation
      const autorisation = database.recevoirAutorisationMainlevee({
        ...donneesAutorisation,
        sourceKit: true,
        headers: {
          correlationId: req.headers['x-correlation-id'],
          source: req.headers['x-authorization-source']
        }
      });

      console.log(`✅ [Pays A] Autorisation mainlevée acceptée depuis Kit MuleSoft: ${autorisation.id}`);
      console.log(`💰 [Pays A] Montant acquitté: ${autorisation.montantAcquitte} FCFA`);
      console.log(`📋 [Pays A] Manifeste ${manifeste.id} -> Statut: ${manifeste.statut}`);

      // ✅ CORRECTION: Réponse adaptée pour MuleSoft
      const reponse = {
        status: 'ACCEPTED',
        message: 'Autorisation de mainlevée acceptée avec succès',
        
        autorisation: {
          id: autorisation.id,
          reference: autorisation.referenceAutorisation,
          numeroManifeste: autorisation.numeroManifeste,
          montantAcquitte: autorisation.montantAcquitte,
          paysDeclarant: autorisation.paysDeclarant,
          dateReception: autorisation.dateReception,
          statut: autorisation.statut
        },
        
        manifeste: {
          id: manifeste.id,
          transporteur: manifeste.transporteur,
          statutActuel: manifeste.statut,
          peutEtreEnleve: manifeste.statut === 'MAINLEVEE_AUTORISEE'
        },
        
        instructions: [
          'L\'autorisation de mainlevée a été enregistrée',
          'Le manifeste peut maintenant être traité pour enlèvement',
          'Présentez cette autorisation au bureau de douane',
          'Vérification documentaire requise avant enlèvement'
        ],
        
        contact: {
          bureau: 'Bureau Principal Douanes Abidjan',
          telephone: '+225-XX-XX-XX-XX',
          horaires: 'Lundi-Vendredi 8h-17h'
        },
        
        timestamp: new Date().toISOString(),
        correlationId: req.headers['x-correlation-id']
      };

      res.status(200).json(reponse);
      
    } else if (req.method === 'GET') {
      // Lister les autorisations reçues
      const autorisations = database.listerAutorisations();
      
      res.status(200).json({
        status: 'SUCCESS',
        message: 'Liste des autorisations de mainlevée',
        autorisations: autorisations.map(auth => ({
          id: auth.id,
          reference: auth.referenceAutorisation,
          numeroManifeste: auth.numeroManifeste,
          montantAcquitte: auth.montantAcquitte,
          paysDeclarant: auth.paysDeclarant,
          dateReception: auth.dateReception,
          statut: auth.statut,
          sourceKit: auth.sourceKit || false
        })),
        total: autorisations.length,
        timestamp: new Date().toISOString()
      });
      
    } else {
      res.status(405).json({ 
        erreur: 'Méthode non autorisée',
        methodesAutorisees: ['GET', 'POST', 'OPTIONS']
      });
    }
    
  } catch (error) {
    console.error('❌ [Pays A] Erreur API autorisation:', error);
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du traitement de l\'autorisation',
      erreur: error.message,
      timestamp: new Date().toISOString()
    });
  }
};