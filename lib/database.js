// Base de données Pays A (Côtier) - Côte d'Ivoire - SUPPORT FORMAT UEMOA
class PaysADatabase {
  constructor() {
    this.manifestes = new Map();
    this.autorisationsMainlevee = new Map();
    this.interactionsKit = [];
    this.statistiques = {
      manifestesCreees: 0,
      transmissionsKit: 0,
      transmissionsReussies: 0,
      autorisationsRecues: 0,
      erreurs: 0,
      derniereMiseAJour: new Date()
    };
    
    console.log('🏗️ Base de données Pays A (Côtier) initialisée - Support UEMOA 2025.1');
  }

  // === GESTION DES MANIFESTES UEMOA ===
  creerManifeste(donneesManifeste) {
    // ✅ Détection automatique du format
    const formatDetecte = this.detecterFormatManifeste(donneesManifeste);
    console.log(`🔍 [DB] Format manifeste détecté: ${formatDetecte}`);
    
    let id, manifesteNormalise;
    
    if (formatDetecte === 'UEMOA') {
      // ✅ Format UEMOA natif
      id = `UEMOA_${donneesManifeste.numero_manif}_${donneesManifeste.annee_manif}`;
      manifesteNormalise = {
        id,
        format: 'UEMOA',
        ...donneesManifeste,
        statut: 'CREE',
        dateCreation: new Date(),
        paysOrigine: 'CIV', // Côte d'Ivoire
        transmissionKit: null // Sera rempli lors de la transmission
      };
    } else {
      // ✅ Format legacy - conversion automatique
      id = donneesManifeste.numeroManifeste || `MAN${Date.now()}`;
      manifesteNormalise = this.convertirLegacyVersUEMOA(donneesManifeste, id);
    }
    
    this.manifestes.set(id, manifesteNormalise);
    this.statistiques.manifestesCreees++;
    this.statistiques.derniereMiseAJour = new Date();
    
    console.log(`📋 Manifeste ${formatDetecte} créé: ${id}`);
    return manifesteNormalise;
  }

  // ✅ NOUVEAU: Détection du format de manifeste
  detecterFormatManifeste(donnees) {
    if (!donnees) return 'UNKNOWN';
    
    // Vérifier si c'est le format UEMOA
    const champsUEMOA = [
      'annee_manif', 'bureau_manif', 'numero_manif', 'code_cgt',
      'consignataire', 'navire', 'provenance', 'pavillon'
    ];
    
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

  // ✅ NOUVEAU: Conversion legacy vers UEMOA pour rétrocompatibilité
  convertirLegacyVersUEMOA(manifesteLegacy, id) {
    console.log(`🔄 [DB] Conversion manifeste legacy vers UEMOA: ${id}`);
    
    const manifesteUEMOA = {
      id,
      format: 'UEMOA_CONVERTED',
      
      // ✅ Mapping legacy → UEMOA
      annee_manif: new Date().getFullYear().toString(),
      bureau_manif: "18N", // Valeur par défaut
      numero_manif: parseInt(manifesteLegacy.numeroManifeste?.replace(/\D/g, '')) || Date.now(),
      code_cgt: "014", // Valeur par défaut
      consignataire: manifesteLegacy.transporteur || "TRANSPORTEUR CONVERTI",
      repertoire: "02402", // Valeur par défaut
      navire: manifesteLegacy.navire || "NAVIRE CONVERTI",
      provenance: manifesteLegacy.portEmbarquement || "PORT CONVERTI",
      pavillon: "PAVILLON CONVERTI",
      date_arrivee: manifesteLegacy.dateArrivee,
      valapprox: 0,
      nbre_article: manifesteLegacy.marchandises?.length || 0,
      
      // ✅ Conversion des marchandises vers articles UEMOA
      articles: manifesteLegacy.marchandises?.map((marchandise, index) => ({
        art: index + 1,
        prec1: 0,
        prec2: 0,
        date_emb: manifesteLegacy.dateArrivee,
        lieu_emb: manifesteLegacy.portEmbarquement || "LIEU CONVERTI",
        pays_dest: marchandise.paysDestination,
        ville_dest: "VILLE_DEST_CONVERTIE",
        connaissement: `CONV_${Date.now()}_${index}`,
        expediteur: "EXPEDITEUR CONVERTI",
        destinataire: marchandise.destinataire,
        voie_dest: "",
        ordre: "",
        marchandise: marchandise.designation,
        poids: marchandise.poidsBrut || 0,
        nbre_colis: marchandise.nombreColis || 1,
        marque: "CONV",
        mode_cond: "COLIS (PACKAGE)",
        nbre_conteneur: 1,
        conteneurs: [{
          conteneur: `CONV${Date.now()}${index}`,
          type: "DRS",
          taille: "40",
          plomb: `CONV_PL${Date.now()}${index}`
        }]
      })) || [],
      
      // ✅ Métadonnées
      statut: 'CREE',
      dateCreation: new Date(),
      paysOrigine: 'CIV',
      transmissionKit: null,
      conversionLegacy: true
    };
    
    console.log(`✅ [DB] Conversion legacy → UEMOA terminée pour ${id}`);
    return manifesteUEMOA;
  }

  obtenirManifeste(id) {
    return this.manifestes.get(id);
  }

  listerManifestes(limite = 10) {
    const manifestes = Array.from(this.manifestes.values());
    return manifestes
      .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
      .slice(0, limite);
  }

  // === INTERACTIONS AVEC LE KIT UEMOA ===
  enregistrerTransmissionKit(manifesteId, reponseKit, succes = true) {
    const manifeste = this.manifestes.get(manifesteId);
    if (!manifeste) return null;

    const transmission = {
      dateTransmission: new Date(),
      statut: succes ? 'TRANSMIS' : 'ERREUR',
      reponseKit: reponseKit,
      latence: reponseKit.latence || 0,
      formatUEMOA: reponseKit.formatUEMOA || false
    };

    manifeste.transmissionKit = transmission;
    manifeste.statut = succes ? 'TRANSMIS_KIT' : 'ERREUR_TRANSMISSION';

    // Mettre à jour statistiques
    this.statistiques.transmissionsKit++;
    if (succes) {
      this.statistiques.transmissionsReussies++;
    } else {
      this.statistiques.erreurs++;
    }

    // Ajouter à l'historique des interactions
    this.ajouterInteractionKit('TRANSMISSION_MANIFESTE_UEMOA', {
      manifesteId,
      statut: transmission.statut,
      format: manifeste.format || 'UNKNOWN',
      details: reponseKit
    });

    console.log(`🚀 Transmission Kit UEMOA ${succes ? 'réussie' : 'échouée'}: ${manifesteId}`);
    return transmission;
  }

  ajouterInteractionKit(type, donnees) {
    const interaction = {
      id: `INT_UEMOA_${Date.now()}`,
      type,
      timestamp: new Date(),
      donnees,
      formatUEMOA: true
    };

    this.interactionsKit.unshift(interaction);
    
    // Garder seulement les 50 dernières interactions
    if (this.interactionsKit.length > 50) {
      this.interactionsKit = this.interactionsKit.slice(0, 50);
    }

    return interaction;
  }

  obtenirInteractionsKit(limite = 20) {
    return this.interactionsKit.slice(0, limite);
  }

  // === AUTORISATIONS DE MAINLEVÉE UEMOA ===
  recevoirAutorisationMainlevee(autorisation) {
    const id = autorisation.referenceAutorisation || `AUTH_UEMOA_${Date.now()}`;
    
    const autorisationComplete = {
      id,
      ...autorisation,
      dateReception: new Date(),
      statut: 'RECUE',
      formatUEMOA: true
    };

    this.autorisationsMainlevee.set(id, autorisationComplete);
    this.statistiques.autorisationsRecues++;

    // ✅ Mettre à jour le manifeste correspondant (support UEMOA et legacy)
    const manifeste = Array.from(this.manifestes.values())
      .find(m => {
        // Chercher par numéro UEMOA ou legacy
        return m.numero_manif == autorisation.numeroManifeste || 
               m.numeroManifeste === autorisation.numeroManifeste ||
               m.id === autorisation.numeroManifeste;
      });
    
    if (manifeste) {
      manifeste.statut = 'MAINLEVEE_AUTORISEE';
      manifeste.autorisationMainlevee = autorisationComplete;
      console.log(`🔓 Autorisation mainlevée associée au manifeste ${manifeste.format}: ${manifeste.id}`);
    } else {
      console.warn(`⚠️ Aucun manifeste trouvé pour l'autorisation: ${autorisation.numeroManifeste}`);
    }

    this.ajouterInteractionKit('AUTORISATION_MAINLEVEE_UEMOA', {
      autorisationId: id,
      manifesteId: autorisation.numeroManifeste,
      montant: autorisation.montantAcquitte
    });

    console.log(`🔓 Autorisation mainlevée UEMOA reçue: ${id}`);
    return autorisationComplete;
  }

  listerAutorisations(limite = 10) {
    const autorisations = Array.from(this.autorisationsMainlevee.values());
    return autorisations
      .sort((a, b) => new Date(b.dateReception) - new Date(a.dateReception))
      .slice(0, limite);
  }

  // === STATISTIQUES UEMOA ===
  obtenirStatistiques() {
    const maintenant = new Date();
    const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    
    // Compter les opérations d'aujourd'hui
    const manifestesAujourdhui = Array.from(this.manifestes.values())
      .filter(m => new Date(m.dateCreation) >= aujourdhui).length;
    
    const autorisationsAujourdhui = Array.from(this.autorisationsMainlevee.values())
      .filter(a => new Date(a.dateReception) >= aujourdhui).length;
    
    const interactionsAujourdhui = this.interactionsKit
      .filter(i => new Date(i.timestamp) >= aujourdhui).length;

    // ✅ Statistiques par format
    const manifestes = Array.from(this.manifestes.values());
    const manifestesUEMOA = manifestes.filter(m => m.format === 'UEMOA').length;
    const manifestesConverts = manifestes.filter(m => m.format === 'UEMOA_CONVERTED').length;
    const manifestesLegacy = manifestes.filter(m => !m.format || m.format === 'LEGACY').length;

    return {
      ...this.statistiques,
      manifestesAujourdhui,
      autorisationsAujourdhui,
      interactionsAujourdhui,
      tauxReussiteTransmission: this.statistiques.transmissionsKit > 0 
        ? Math.round((this.statistiques.transmissionsReussies / this.statistiques.transmissionsKit) * 100) 
        : 100,
      derniereMiseAJour: new Date(),
      
      // ✅ Nouvelles statistiques UEMOA
      repartitionFormats: {
        uemoa: manifestesUEMOA,
        converts: manifestesConverts,
        legacy: manifestesLegacy,
        total: manifestes.length
      },
      
      complianceUEMOA: {
        pourcentageUEMOA: manifestes.length > 0 ? Math.round((manifestesUEMOA / manifestes.length) * 100) : 0,
        pourcentageConversion: manifestes.length > 0 ? Math.round((manifestesConverts / manifestes.length) * 100) : 0,
        supportTotal: manifestesUEMOA + manifestesConverts
      }
    };
  }

  // === MÉTHODES UTILITAIRES UEMOA ===
  reinitialiser() {
    this.manifestes.clear();
    this.autorisationsMainlevee.clear();
    this.interactionsKit = [];
    this.statistiques = {
      manifestesCreees: 0,
      transmissionsKit: 0,
      transmissionsReussies: 0,
      autorisationsRecues: 0,
      erreurs: 0,
      derniereMiseAJour: new Date()
    };
    console.log('🔄 Base de données Pays A réinitialisée (support UEMOA)');
  }

  // ✅ Simulation de données UEMOA pour démonstration
  genererDonneesTestUEMOA() {
    // Manifeste format UEMOA
    const manifesteUEMOA = this.creerManifeste({
      annee_manif: "2025",
      bureau_manif: "18N",
      numero_manif: 5016,
      code_cgt: "014",
      consignataire: "MAERSK LINE",
      repertoire: "02402",
      navire: "MARCO POLO",
      provenance: "ROTTERDAM",
      pavillon: "LIBÉRIA",
      date_arrivee: "2025-01-15",
      valapprox: 150000,
      nbre_article: 1,
      articles: [{
        art: 1,
        prec1: 0,
        prec2: 0,
        date_emb: "2025-01-02",
        lieu_emb: "Rotterdam",
        pays_dest: "BURKINA FASO",
        ville_dest: "OUAGADOUGOU",
        connaissement: "233698813",
        expediteur: "EXPORT COMPANY LTD",
        destinataire: "IMPORT SARL OUAGADOUGOU",
        voie_dest: "Route terrestre",
        ordre: "BANQUE ATLANTIQUE",
        marchandise: "Véhicule particulier Toyota Corolla",
        poids: 1500,
        nbre_colis: 1,
        marque: "TOYOTA",
        mode_cond: "COLIS (PACKAGE)",
        nbre_conteneur: 1,
        conteneurs: [{
          conteneur: "TCLU1758689",
          type: "DRS",
          taille: "40",
          plomb: "AE0293467"
        }]
      }]
    });

    // Simuler transmission réussie
    this.enregistrerTransmissionKit(manifesteUEMOA.id, {
      status: 'SUCCESS',
      message: 'Manifeste UEMOA transmis avec succès',
      latence: 245,
      formatUEMOA: true
    }, true);

    console.log('🧪 Données de test UEMOA générées');
    return manifesteUEMOA;
  }

  // ✅ Méthode pour obtenir les statistiques détaillées UEMOA
  obtenirStatistiquesDetailleesUEMOA() {
    const manifestes = Array.from(this.manifestes.values());
    const interactions = this.interactionsKit;
    
    return {
      formats: {
        total: manifestes.length,
        uemoa_natif: manifestes.filter(m => m.format === 'UEMOA').length,
        uemoa_converti: manifestes.filter(m => m.format === 'UEMOA_CONVERTED').length,
        legacy: manifestes.filter(m => !m.format || m.format === 'LEGACY').length
      },
      
      articles: {
        total: manifestes.reduce((sum, m) => sum + (m.nbre_article || m.marchandises?.length || 0), 0),
        moyenne_par_manifeste: manifestes.length > 0 ? 
          Math.round(manifestes.reduce((sum, m) => sum + (m.nbre_article || m.marchandises?.length || 0), 0) / manifestes.length * 100) / 100 : 0
      },
      
      conteneurs: {
        total: manifestes.reduce((sum, m) => {
          if (m.articles) {
            return sum + m.articles.reduce((articleSum, article) => articleSum + (article.nbre_conteneur || 0), 0);
          }
          return sum;
        }, 0)
      },
      
      pays_destinations: {
        uniques: [...new Set(manifestes.flatMap(m => {
          if (m.articles) {
            return m.articles.map(a => a.pays_dest);
          } else if (m.marchandises) {
            return m.marchandises.map(marc => marc.paysDestination);
          }
          return [];
        }).filter(Boolean))],
        repartition: this.calculerRepartitionDestinations(manifestes)
      },
      
      transmissions: {
        total: interactions.filter(i => i.type.includes('TRANSMISSION')).length,
        reussies: interactions.filter(i => i.type.includes('TRANSMISSION') && i.donnees?.statut === 'TRANSMIS').length,
        echecs: interactions.filter(i => i.type.includes('TRANSMISSION') && i.donnees?.statut === 'ERREUR').length,
        latence_moyenne: this.calculerLatenceMoyenne(interactions)
      }
    };
  }

  calculerRepartitionDestinations(manifestes) {
    const repartition = {};
    
    manifestes.forEach(m => {
      let destinations = [];
      if (m.articles) {
        destinations = m.articles.map(a => a.pays_dest);
      } else if (m.marchandises) {
        destinations = m.marchandises.map(marc => marc.paysDestination);
      }
      
      destinations.filter(Boolean).forEach(dest => {
        repartition[dest] = (repartition[dest] || 0) + 1;
      });
    });
    
    return repartition;
  }

  calculerLatenceMoyenne(interactions) {
    const transmissions = interactions
      .filter(i => i.type.includes('TRANSMISSION') && i.donnees?.details?.latence)
      .map(i => i.donnees.details.latence);
    
    return transmissions.length > 0 ? 
      Math.round(transmissions.reduce((sum, lat) => sum + lat, 0) / transmissions.length) : 0;
  }
}

// Instance singleton
const database = new PaysADatabase();

// Générer quelques données de test UEMOA au démarrage
database.genererDonneesTestUEMOA();

module.exports = database;