// ============================================================================
// SÉNÉGAL - API Lister Manifestes 
// Fichier: api/manifeste/lister.js
// Port de Dakar - Pays de prime abord
// ============================================================================

const database = require('../../lib/database');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Source-Country, X-Source-System');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Paramètres de requête
      const limite = parseInt(req.query.limite) || 20;
      const statut = req.query.statut;
      const paysDestination = req.query.paysDestination;
      const etapeWorkflow = req.query.etapeWorkflow;
      
      console.log(`📋 [SÉNÉGAL] Demande liste manifestes Port de Dakar (limite: ${limite})`);
      if (statut) console.log(`🔍 [SÉNÉGAL] Filtre statut: ${statut}`);
      if (paysDestination) console.log(`🔍 [SÉNÉGAL] Filtre pays destination: ${paysDestination}`);

      // Récupérer tous les manifestes du Sénégal
      let manifestes = Array.from(database.manifestes.values())
        .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));

      // Filtrage par statut
      if (statut) {
        manifestes = manifestes.filter(m => m.statut === statut);
      }
      
      // Filtrage par pays de destination
      if (paysDestination) {
        manifestes = manifestes.filter(m => {
          if (m.articles) {
            // Format UEMOA
            return m.articles.some(article => article.pays_dest === paysDestination);
          } else if (m.marchandises) {
            // Format legacy
            return m.marchandises.some(marchandise => marchandise.paysDestination === paysDestination);
          }
          return false;
        });
      }

      // Filtrage par étape workflow
      if (etapeWorkflow) {
        manifestes = manifestes.filter(m => m.etapeWorkflow === etapeWorkflow);
      }

      // Limiter après filtrage
      manifestes = manifestes.slice(0, limite);

      // Transformer pour l'API avec informations complètes Sénégal
      const manifestesFormates = manifestes.map(manifeste => {
        // Déterminer les pays de destination
        let paysDestinations = [];
        let nombreArticles = 0;
        let poidsTotal = 0;

        if (manifeste.articles) {
          // Format UEMOA
          paysDestinations = [...new Set(manifeste.articles.map(a => a.pays_dest).filter(Boolean))];
          nombreArticles = manifeste.articles.length;
          poidsTotal = manifeste.articles.reduce((total, a) => total + (parseFloat(a.poids) || 0), 0);
        } else if (manifeste.marchandises) {
          // Format legacy
          paysDestinations = [...new Set(manifeste.marchandises.map(m => m.paysDestination).filter(Boolean))];
          nombreArticles = manifeste.marchandises.length;
          poidsTotal = manifeste.marchandises.reduce((total, m) => total + (parseFloat(m.poidsBrut) || 0), 0);
        }

        return {
          id: manifeste.id,
          
          // Informations manifeste - Format UEMOA prioritaire
          numero_manif: manifeste.numero_manif,
          numeroManifeste: manifeste.numeroManifeste || manifeste.numero_manif,
          annee_manif: manifeste.annee_manif,
          bureau_manif: manifeste.bureau_manif,
          
          // Consignataire/Transporteur
          consignataire: manifeste.consignataire,
          transporteur: manifeste.transporteur || manifeste.consignataire,
          
          // Informations navire
          navire: manifeste.navire,
          provenance: manifeste.provenance || manifeste.portEmbarquement,
          pavillon: manifeste.pavillon,
          
          // Ports - Sénégal comme pays de prime abord
          ports: {
            embarquement: manifeste.provenance || manifeste.portEmbarquement || 'ROTTERDAM',
            debarquement: 'Port de Dakar', // Fixé pour Sénégal
            paysOrigine: 'SEN'
          },
          
          // Dates
          date_arrivee: manifeste.date_arrivee || manifeste.dateArrivee,
          dateCreation: manifeste.dateCreation,
          
          // Statut et workflow
          statut: manifeste.statut,
          etapeWorkflow: manifeste.etapeWorkflow,
          
          // Informations marchandises/articles
          marchandises: {
            nombre: nombreArticles,
            paysDestinations: paysDestinations,
            poidsTotal: Math.round(poidsTotal),
            format: manifeste.articles ? 'UEMOA' : 'LEGACY'
          },
          
          // Informations transmission Kit
          transmission: manifeste.transmissionKit ? {
            statut: manifeste.transmissionKit.statut,
            dateTransmission: manifeste.transmissionKit.dateTransmission,
            latence: manifeste.transmissionKit.latence,
            reussie: manifeste.transmissionKit.statut === 'TRANSMIS_KIT',
            formatTransmis: 'UEMOA',
            kitUrl: 'MuleSoft API'
          } : {
            statut: 'NON_TRANSMIS',
            reussie: false
          },
          
          // Informations déclaration/recouvrement (ÉTAPE 17)
          declaration: manifeste.informationsDeclaration ? {
            reçue: true,
            referenceDeclaration: manifeste.informationsDeclaration.referenceDeclaration,
            montantAcquitte: manifeste.informationsDeclaration.montantAcquitte,
            monnaie: manifeste.informationsDeclaration.monnaie || 'FCFA',
            paysDeclarant: manifeste.informationsDeclaration.paysDeclarant,
            dateReception: manifeste.informationsDeclaration.dateReception,
            etapeWorkflow: 17
          } : {
            reçue: false,
            enAttente: manifeste.transmissionKit?.statut === 'TRANSMIS_KIT'
          },
          
          // Informations apurement (ÉTAPE 18)
          apurement: manifeste.apurement ? {
            effectue: true,
            id: manifeste.apurement.id,
            dateApurement: manifeste.apurement.dateApurement,
            agentConfirmation: manifeste.apurement.agentConfirmation,
            typeConfirmation: manifeste.apurement.typeConfirmation,
            referencePaiement: manifeste.apurement.referencePaiement,
            etapeWorkflow: 18
          } : {
            effectue: false,
            peutEtreApure: manifeste.statut === 'DECLARATION_RECUE'
          },
          
          // Main levée (ÉTAPE 19)
          mainlevee: manifeste.bonEnlever ? {
            attribuee: true,
            bonId: manifeste.bonEnlever.id,
            dateMainlevee: manifeste.bonEnlever.dateMainlevee,
            portEnlevement: manifeste.bonEnlever.portEnlevement || 'Port de Dakar',
            peutEtreEnleve: true,
            etapeWorkflow: 19
          } : {
            attribuee: false,
            peutEtreEnleve: false
          },
          
          // Progression workflow (1-21 étapes)
          progressionWorkflow: {
            etapesCompletes: getEtapesCompletes(manifeste),
            etapeActuelle: getEtapeActuelle(manifeste),
            prochaine_etape: getProchaine_etape(manifeste),
            workflowTermine: manifeste.statut === 'MAINLEVEE_ATTRIBUEE'
          }
        };
      });

      // Statistiques pour cette requête
      const stats = calculerStatistiques(manifestesFormates);

      const reponse = {
        status: 'SUCCESS',
        message: `Liste de ${manifestesFormates.length} manifeste(s) du Port de Dakar`,
        
        paysTraitement: {
          code: 'SEN',
          nom: 'Sénégal',
          ville: 'Dakar',
          port: 'Port de Dakar',
          role: 'PAYS_PRIME_ABORD'
        },
        
        manifestes: manifestesFormates,
        
        pagination: {
          limite,
          retournes: manifestesFormates.length,
          filtres: {
            ...(statut && { statut }),
            ...(paysDestination && { paysDestination }),
            ...(etapeWorkflow && { etapeWorkflow })
          }
        },
        
        statistiques: stats,
        
        workflow: {
          etapesDisponibles: [
            'MANIFESTE_CREE', 'TRANSMIS_VERS_DESTINATION', 'DECLARATION_RECUE', 
            'APURE', 'MAINLEVEE_ATTRIBUEE'
          ],
          paysDestinationsDisponibles: [...new Set(manifestesFormates
            .flatMap(m => m.marchandises.paysDestinations))].sort()
        },
        
        timestamp: new Date().toISOString()
      };

      res.status(200).json(reponse);
      
    } catch (error) {
      console.error('❌ [SÉNÉGAL] Erreur liste manifestes:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erreur lors de la récupération des manifestes du Port de Dakar',
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
      status: 'ERROR',
      message: 'Méthode non autorisée',
      methodesAutorisees: ['GET', 'OPTIONS'],
      paysTraitement: {
        code: 'SEN',
        nom: 'Sénégal',
        port: 'Port de Dakar'
      }
    });
  }
};

// ✅ Fonctions utilitaires pour le workflow Sénégal

function getEtapesCompletes(manifeste) {
  const etapes = [];
  
  if (manifeste.dateCreation) etapes.push('1-3'); // Création + enregistrement
  if (manifeste.transmissionKit?.statut === 'TRANSMIS_KIT') etapes.push('4-5'); // Transmission Kit
  if (manifeste.informationsDeclaration) etapes.push('17'); // Réception déclaration
  if (manifeste.apurement) etapes.push('18'); // Apurement
  if (manifeste.bonEnlever) etapes.push('19'); // Main levée
  
  return etapes.join(', ');
}

function getEtapeActuelle(manifeste) {
  if (manifeste.bonEnlever) return 19; // Main levée attribuée
  if (manifeste.apurement) return 18; // Apuré
  if (manifeste.informationsDeclaration) return 17; // Déclaration reçue
  if (manifeste.transmissionKit?.statut === 'TRANSMIS_KIT') return 5; // Transmis Kit
  if (manifeste.dateCreation) return 3; // Créé localement
  return 1;
}

function getProchaine_etape(manifeste) {
  if (manifeste.bonEnlever) return '20-21: Délivrance et libre circulation';
  if (manifeste.apurement) return '19: Attribution main levée';
  if (manifeste.informationsDeclaration) return '18: Apurement du manifeste';
  if (manifeste.transmissionKit?.statut === 'TRANSMIS_KIT') return '6-16: Traitement pays destination puis 17: Retour déclaration';
  if (manifeste.dateCreation) return '4-5: Transmission vers Kit MuleSoft';
  return '1-3: Création et enregistrement';
}

function calculerStatistiques(manifestes) {
  const total = manifestes.length;
  
  const parStatut = manifestes.reduce((acc, m) => {
    acc[m.statut] = (acc[m.statut] || 0) + 1;
    return acc;
  }, {});

  const transmissions = {
    reussies: manifestes.filter(m => m.transmission.reussie).length,
    echecs: manifestes.filter(m => m.transmission.statut && !m.transmission.reussie).length,
    enAttente: manifestes.filter(m => !m.transmission.statut).length
  };

  const workflow = {
    etape_1_3: manifestes.filter(m => m.dateCreation).length,
    etape_4_5: manifestes.filter(m => m.transmission.reussie).length,
    etape_17: manifestes.filter(m => m.declaration.reçue).length,
    etape_18: manifestes.filter(m => m.apurement.effectue).length,
    etape_19: manifestes.filter(m => m.mainlevee.attribuee).length
  };

  const paysDestinations = {};
  manifestes.forEach(m => {
    m.marchandises.paysDestinations.forEach(pays => {
      paysDestinations[pays] = (paysDestinations[pays] || 0) + 1;
    });
  });

  return {
    total,
    parStatut,
    transmissions,
    workflow,
    paysDestinations,
    formats: {
      uemoa: manifestes.filter(m => m.marchandises.format === 'UEMOA').length,
      legacy: manifestes.filter(m => m.marchandises.format === 'LEGACY').length
    }
  };
}