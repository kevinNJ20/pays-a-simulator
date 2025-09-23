// ============================================================================
// CORRECTIONS PAYS A - SÉNÉGAL (DAKAR) - PAYS DE PRIME ABORD
// Conformément au rapport PDF UEMOA - Simulation des 21 étapes
// ============================================================================

// 1. CORRECTION lib/database.js - Base de données Pays A (Sénégal)
class PaysADatabase {
  constructor() {
    this.manifestes = new Map();
    this.autorisationsMainlevee = new Map();
    this.declarationsTransit = new Map(); // ✅ AJOUT Transit
    this.interactionsKit = [];
    this.apurements = new Map(); // ✅ AJOUT Apurements
    this.statistiques = {
      manifestesCreees: 0,
      transmissionsKit: 0,
      transmissionsReussies: 0,
      autorisationsRecues: 0,
      apurementsTraites: 0, // ✅ AJOUT
      transitsCrees: 0, // ✅ AJOUT
      erreurs: 0,
      derniereMiseAJour: new Date()
    };
    
    // ✅ CORRECTION Identité Pays A = Sénégal
    this.paysInfo = {
      code: 'SEN',
      nom: 'Sénégal', 
      ville: 'Dakar',
      type: 'COTIER',
      role: 'PAYS_PRIME_ABORD',
      port: 'Port de Dakar'
    };
    
    console.log(`🇸🇳 Base de données ${this.paysInfo.nom} (${this.paysInfo.ville}) initialisée`);
  }

  // ✅ ÉTAPE 1-3 : Création et enregistrement manifeste (Fig 19)
  creerManifeste(donneesManifeste) {
    const formatDetecte = this.detecterFormatManifeste(donneesManifeste);
    console.log(`📋 [${this.paysInfo.code}] ÉTAPE 1-3: Création manifeste format ${formatDetecte}`);
    
    let id, manifesteNormalise;
    
    if (formatDetecte === 'UEMOA') {
      id = `SEN_${donneesManifeste.numero_manif}_${donneesManifeste.annee_manif}`;
      manifesteNormalise = {
        id,
        format: 'UEMOA',
        ...donneesManifeste,
        statut: 'MANIFESTE_CREE', // ✅ Statut spécifique Pays A
        dateCreation: new Date(),
        paysOrigine: this.paysInfo.code,
        portDebarquement: this.paysInfo.port,
        etapeWorkflow: 'CREATION_MANIFESTE', // ✅ Suivi workflow
        transmissionKit: null,
        // ✅ Champs pour suivi du workflow 21 étapes
        workflow: {
          etape1_manifesteRecu: new Date(),
          etape2_informationsEnregistrees: new Date(),
          etape3_stockageLocal: new Date(),
          etape4_transmissionKit: null,
          etape5_extractionTransmise: null,
          etape17_declarationRecue: null,
          etape18_apurement: null,
          etape19_mainlevee: null
        }
      };
    } else {
      // Conversion legacy vers UEMOA pour Sénégal
      id = `SEN_CONV_${Date.now()}`;
      manifesteNormalise = this.convertirLegacyVersUEMOA(donneesManifeste, id);
    }
    
    this.manifestes.set(id, manifesteNormalise);
    this.statistiques.manifestesCreees++;
    this.statistiques.derniereMiseAJour = new Date();
    
    console.log(`✅ [${this.paysInfo.code}] ÉTAPES 1-3 complétées: Manifeste ${id} créé et stocké`);
    this.ajouterInteractionWorkflow('CREATION_MANIFESTE', `Manifeste ${id} - Étapes 1-3 terminées`);
    
    return manifesteNormalise;
  }

  // ✅ ÉTAPE 4 : Enregistrement transmission Kit (Fig 19)
  enregistrerTransmissionKit(manifesteId, reponseKit, succes = true) {
    console.log(`🚀 [${this.paysInfo.code}] ÉTAPE 4: Transmission Kit pour ${manifesteId}`);
    
    const manifeste = this.manifestes.get(manifesteId);
    if (!manifeste) return null;

    const transmission = {
      dateTransmission: new Date(),
      statut: succes ? 'TRANSMIS_KIT' : 'ERREUR_TRANSMISSION',
      reponseKit: reponseKit,
      latence: reponseKit.latence || 0,
      formatUEMOA: true,
      etapeWorkflow: 4
    };

    manifeste.transmissionKit = transmission;
    manifeste.statut = succes ? 'TRANSMIS_VERS_DESTINATION' : 'ERREUR_TRANSMISSION';
    manifeste.etapeWorkflow = succes ? 'TRANSMISSION_KIT' : 'ERREUR_TRANSMISSION';
    
    // ✅ Mise à jour workflow
    if (succes) {
      manifeste.workflow.etape4_transmissionKit = new Date();
      manifeste.workflow.etape5_extractionTransmise = new Date();
    }

    this.statistiques.transmissionsKit++;
    if (succes) {
      this.statistiques.transmissionsReussies++;
    } else {
      this.statistiques.erreurs++;
    }

    this.ajouterInteractionWorkflow('TRANSMISSION_KIT', 
      `${succes ? '✅' : '❌'} Étape 4-5: Transmission ${manifesteId} ${succes ? 'réussie' : 'échouée'}`);
    
    console.log(`${succes ? '✅' : '❌'} [${this.paysInfo.code}] ÉTAPE 4-5: Transmission vers Kit ${succes ? 'réussie' : 'échouée'}`);
    return transmission;
  }

  // ✅ ÉTAPE 17 : Réception informations déclaration/recouvrement (Fig 19)  
  recevoirInformationsDeclaration(donneesDeclaration) {
    console.log(`📥 [${this.paysInfo.code}] ÉTAPE 17: Réception informations déclaration/recouvrement`);
    
    const manifeste = Array.from(this.manifestes.values())
      .find(m => m.numero_manif == donneesDeclaration.numeroManifeste || 
                 m.numeroManifeste === donneesDeclaration.numeroManifeste);
    
    if (manifeste) {
      manifeste.informationsDeclaration = {
        ...donneesDeclaration,
        dateReception: new Date(),
        etapeWorkflow: 17
      };
      
      manifeste.statut = 'DECLARATION_RECUE';
      manifeste.etapeWorkflow = 'DECLARATION_RECUE';
      manifeste.workflow.etape17_declarationRecue = new Date();
      
      console.log(`✅ [${this.paysInfo.code}] ÉTAPE 17: Informations déclaration reçues pour ${manifeste.id}`);
      this.ajouterInteractionWorkflow('DECLARATION_RECUE', 
        `Étape 17: Informations déclaration/recouvrement reçues pour ${manifeste.id}`);
    }
    
    return manifeste;
  }

  // ✅ ÉTAPE 18 : Apurement du manifeste (Fig 19)
  traiterApurement(donneesApurement) {
    console.log(`🔓 [${this.paysInfo.code}] ÉTAPE 18: Apurement manifeste ${donneesApurement.numeroManifeste}`);
    
    const manifeste = Array.from(this.manifestes.values())
      .find(m => m.numero_manif == donneesApurement.numeroManifeste || 
                 m.numeroManifeste === donneesApurement.numeroManifeste);
    
    if (!manifeste) {
      throw new Error(`Manifeste ${donneesApurement.numeroManifeste} introuvable pour apurement`);
    }
    
    const apurement = {
      id: `APU_SEN_${Date.now()}`,
      manifesteId: manifeste.id,
      numeroManifeste: donneesApurement.numeroManifeste,
      referencePaiement: donneesApurement.referencePaiement,
      dateApurement: new Date(),
      paysApurement: this.paysInfo.code,
      typeConfirmation: donneesApurement.typeConfirmation || 'DOUANE',
      agentConfirmation: donneesApurement.agentConfirmation,
      observations: donneesApurement.observations || '',
      statutApurement: 'CONFIRME',
      etapeWorkflow: 18
    };
    
    this.apurements.set(apurement.id, apurement);
    
    manifeste.apurement = apurement;
    manifeste.statut = 'APURE';
    manifeste.etapeWorkflow = 'APUREMENT';
    manifeste.workflow.etape18_apurement = new Date();
    
    this.statistiques.apurementsTraites++;
    
    console.log(`✅ [${this.paysInfo.code}] ÉTAPE 18: Apurement ${apurement.id} confirmé`);
    this.ajouterInteractionWorkflow('APUREMENT', 
      `Étape 18: Apurement confirmé pour ${manifeste.id}`);
    
    return apurement;
  }

  // ✅ ÉTAPE 19 : Attribution main levée (Bon à enlever) (Fig 19)
  attribuerMainlevee(manifesteId) {
    console.log(`🔓 [${this.paysInfo.code}] ÉTAPE 19: Attribution main levée ${manifesteId}`);
    
    const manifeste = this.manifestes.get(manifesteId);
    if (!manifeste) {
      throw new Error(`Manifeste ${manifesteId} introuvable pour main levée`);
    }
    
    if (!manifeste.apurement) {
      throw new Error(`Manifeste ${manifesteId} doit être apuré avant main levée`);
    }
    
    const bonEnlever = {
      id: `BAE_SEN_${Date.now()}`,
      manifesteId,
      numeroManifeste: manifeste.numero_manif || manifeste.numeroManifeste,
      dateMainlevee: new Date(),
      agentMainlevee: manifeste.apurement.agentConfirmation,
      paysMainlevee: this.paysInfo.code,
      portEnlevement: this.paysInfo.port,
      referencePaiement: manifeste.apurement.referencePaiement,
      etapeWorkflow: 19,
      instructions: [
        'Marchandises autorisées à l\'enlèvement',
        `Port d'enlèvement: ${this.paysInfo.port}`,
        'Présentez ce bon au service des sorties',
        'Vérification documentaire requise'
      ]
    };
    
    manifeste.bonEnlever = bonEnlever;
    manifeste.statut = 'MAINLEVEE_ATTRIBUEE';
    manifeste.etapeWorkflow = 'MAINLEVEE_ATTRIBUEE'; 
    manifeste.workflow.etape19_mainlevee = new Date();
    
    console.log(`✅ [${this.paysInfo.code}] ÉTAPE 19: Main levée attribuée - ${bonEnlever.id}`);
    this.ajouterInteractionWorkflow('MAINLEVEE_ATTRIBUEE', 
      `Étape 19: Bon à enlever ${bonEnlever.id} attribué`);
    
    return bonEnlever;
  }

  // ✅ SCÉNARIO TRANSIT - Création déclaration transit (Fig 20, étapes 1-6)
  creerDeclarationTransit(donneesTransit) {
    console.log(`🚛 [${this.paysInfo.code}] TRANSIT ÉTAPES 1-6: Création déclaration transit`);
    
    const transitId = `TRA_SEN_${Date.now()}`;
    const declarationTransit = {
      id: transitId,
      ...donneesTransit,
      dateCreation: new Date(),
      paysDepart: this.paysInfo.code,
      portDepart: this.paysInfo.port,
      statut: 'TRANSIT_CREE',
      etapesTransit: {
        etape1_arrivee: new Date(),
        etape2_depot: new Date(), 
        etape3_recevabilite: new Date(),
        etape4_enregistrement: new Date(),
        etape5_apurement: new Date(),
        etape6_verification: new Date(),
        etape7_garanties: null,
        etape8_paiement: null,
        etape9_bonEnlever: null,
        etape10_debut: null
      },
      workflow: 'TRANSIT'
    };
    
    this.declarationsTransit.set(transitId, declarationTransit);
    this.statistiques.transitsCrees++;
    
    console.log(`✅ [${this.paysInfo.code}] TRANSIT ÉTAPES 1-6: Déclaration ${transitId} créée`);
    this.ajouterInteractionWorkflow('TRANSIT_CREE', 
      `Transit étapes 1-6: Déclaration ${transitId} créée et vérifiée`);
    
    return declarationTransit;
  }

  // ✅ TRANSIT - Réception message arrivée (Fig 20, étape 14)
  recevoirMessageArrivee(transitId, donneesArrivee) {
    console.log(`📥 [${this.paysInfo.code}] TRANSIT ÉTAPE 14: Message arrivée pour ${transitId}`);
    
    const declarationTransit = this.declarationsTransit.get(transitId);
    if (declarationTransit) {
      declarationTransit.messageArrivee = {
        ...donneesArrivee,
        dateReception: new Date(),
        etapeTransit: 14
      };
      
      declarationTransit.statut = 'ARRIVEE_CONFIRMEE';
      declarationTransit.etapesTransit.etape14_messageArrivee = new Date();
      
      console.log(`✅ [${this.paysInfo.code}] TRANSIT ÉTAPE 14: Arrivée confirmée pour ${transitId}`);
      this.ajouterInteractionWorkflow('TRANSIT_ARRIVEE', 
        `Transit étape 14: Arrivée confirmée pour ${transitId}`);
    }
    
    return declarationTransit;
  }

  // ✅ Ajout interaction avec suivi workflow 
  ajouterInteractionWorkflow(type, description, etape = null) {
    const interaction = {
      id: `INT_SEN_${Date.now()}`,
      type,
      description,
      etapeWorkflow: etape,
      timestamp: new Date(),
      paysCode: this.paysInfo.code,
      paysNom: this.paysInfo.nom,
      formatUEMOA: true
    };

    this.interactionsKit.unshift(interaction);
    
    if (this.interactionsKit.length > 100) {
      this.interactionsKit = this.interactionsKit.slice(0, 100);
    }

    return interaction;
  }

  // ✅ Statistiques détaillées avec workflow
  obtenirStatistiques() {
    const maintenant = new Date();
    const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    
    const manifestesAujourdhui = Array.from(this.manifestes.values())
      .filter(m => new Date(m.dateCreation) >= aujourdhui).length;
    
    const apurementsAujourdhui = Array.from(this.apurements.values())
      .filter(a => new Date(a.dateApurement) >= aujourdhui).length;
    
    // ✅ Statistiques par étape du workflow
    const manifestes = Array.from(this.manifestes.values());
    const workflow = {
      etapes_1_3_creation: manifestes.filter(m => m.workflow?.etape1_manifesteRecu).length,
      etape_4_transmission: manifestes.filter(m => m.workflow?.etape4_transmissionKit).length,
      etape_17_declaration: manifestes.filter(m => m.workflow?.etape17_declarationRecue).length,
      etape_18_apurement: manifestes.filter(m => m.workflow?.etape18_apurement).length,
      etape_19_mainlevee: manifestes.filter(m => m.workflow?.etape19_mainlevee).length
    };

    return {
      ...this.statistiques,
      manifestesAujourdhui,
      apurementsAujourdhui,
      
      // ✅ Statistiques Pays A spécifiques
      paysInfo: this.paysInfo,
      workflow,
      performance: {
        tauxCompletionWorkflow: manifestes.length > 0 ? 
          Math.round((workflow.etape_19_mainlevee / manifestes.length) * 100) : 0,
        tauxTransmissionKit: this.statistiques.transmissionsKit > 0 ?
          Math.round((this.statistiques.transmissionsReussies / this.statistiques.transmissionsKit) * 100) : 100
      },
      
      derniereMiseAJour: new Date()
    };
  }

  // ✅ Méthodes utilitaires pour le workflow
  obtenirEtapeManifeste(manifesteId) {
    const manifeste = this.manifestes.get(manifesteId);
    return manifeste ? manifeste.etapeWorkflow : null;
  }

  listerManifestesParEtape(etape) {
    return Array.from(this.manifestes.values())
      .filter(m => m.etapeWorkflow === etape);
  }

  obtenirWorkflowComplet(manifesteId) {
    const manifeste = this.manifestes.get(manifesteId);
    return manifeste ? manifeste.workflow : null;
  }
}

// ✅ Instance singleton pour Sénégal
const database = new PaysADatabase();

// ✅ Données de test conformes au rapport
database.creerManifeste({
  annee_manif: "2025",
  bureau_manif: "18N", 
  numero_manif: 5016,
  code_cgt: "014",
  consignataire: "MAERSK LINE SENEGAL",
  repertoire: "02402",
  navire: "MARCO POLO",
  provenance: "ROTTERDAM", 
  pavillon: "LIBÉRIA",
  date_arrivee: "2025-01-15",
  valapprox: 150000,
  nbre_article: 1,
  articles: [{
    art: 1,
    pays_dest: "MALI", // ✅ Destination Mali pour le workflow
    ville_dest: "BAMAKO",
    marchandise: "Véhicule particulier Toyota Corolla",
    poids: 1500,
    nbre_colis: 1,
    destinataire: "IMPORT SARL BAMAKO",
    connaissement: "233698813"
  }]
});

module.exports = database;