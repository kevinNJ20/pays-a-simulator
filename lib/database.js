// Base de données Pays A (Côtier) - Côte d'Ivoire
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
    
    console.log('🏗️ Base de données Pays A (Côtier) initialisée');
  }

  // === GESTION DES MANIFESTES ===
  creerManifeste(donneesManifeste) {
    const id = donneesManifeste.numeroManifeste || `MAN${Date.now()}`;
    
    const manifeste = {
      id,
      ...donneesManifeste,
      statut: 'CREE',
      dateCreation: new Date(),
      paysOrigine: 'CIV', // Côte d'Ivoire
      transmissionKit: null // Sera rempli lors de la transmission
    };
    
    this.manifestes.set(id, manifeste);
    this.statistiques.manifestesCreees++;
    this.statistiques.derniereMiseAJour = new Date();
    
    console.log(`📋 Manifeste créé: ${id}`);
    return manifeste;
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

  // === INTERACTIONS AVEC LE KIT ===
  enregistrerTransmissionKit(manifesteId, reponseKit, succes = true) {
    const manifeste = this.manifestes.get(manifesteId);
    if (!manifeste) return null;

    const transmission = {
      dateTransmission: new Date(),
      statut: succes ? 'TRANSMIS' : 'ERREUR',
      reponseKit: reponseKit,
      latence: reponseKit.latence || 0
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
    this.ajouterInteractionKit('TRANSMISSION_MANIFESTE', {
      manifesteId,
      statut: transmission.statut,
      details: reponseKit
    });

    console.log(`🚀 Transmission Kit ${succes ? 'réussie' : 'échouée'}: ${manifesteId}`);
    return transmission;
  }

  ajouterInteractionKit(type, donnees) {
    const interaction = {
      id: `INT${Date.now()}`,
      type,
      timestamp: new Date(),
      donnees
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

  // === AUTORISATIONS DE MAINLEVÉE ===
  recevoirAutorisationMainlevee(autorisation) {
    const id = autorisation.referenceAutorisation || `AUTH${Date.now()}`;
    
    const autorisationComplete = {
      id,
      ...autorisation,
      dateReception: new Date(),
      statut: 'RECUE'
    };

    this.autorisationsMainlevee.set(id, autorisationComplete);
    this.statistiques.autorisationsRecues++;

    // Mettre à jour le manifeste correspondant
    const manifeste = Array.from(this.manifestes.values())
      .find(m => m.id === autorisation.numeroManifeste);
    
    if (manifeste) {
      manifeste.statut = 'MAINLEVEE_AUTORISEE';
      manifeste.autorisationMainlevee = autorisationComplete;
    }

    this.ajouterInteractionKit('AUTORISATION_MAINLEVEE', {
      autorisationId: id,
      manifesteId: autorisation.numeroManifeste,
      montant: autorisation.montantAcquitte
    });

    console.log(`🔓 Autorisation mainlevée reçue: ${id}`);
    return autorisationComplete;
  }

  listerAutorisations(limite = 10) {
    const autorisations = Array.from(this.autorisationsMainlevee.values());
    return autorisations
      .sort((a, b) => new Date(b.dateReception) - new Date(a.dateReception))
      .slice(0, limite);
  }

  // === STATISTIQUES ===
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

    return {
      ...this.statistiques,
      manifestesAujourdhui,
      autorisationsAujourdhui,
      interactionsAujourdhui,
      tauxReussiteTransmission: this.statistiques.transmissionsKit > 0 
        ? Math.round((this.statistiques.transmissionsReussies / this.statistiques.transmissionsKit) * 100) 
        : 100,
      derniereMiseAJour: new Date()
    };
  }

  // === MÉTHODES UTILITAIRES ===
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
    console.log('🔄 Base de données Pays A réinitialisée');
  }

  // Simulation de données pour démonstration
  genererDonneesTest() {
    const manifesteTest = this.creerManifeste({
      numeroManifeste: 'MAN2025001',
      transporteur: 'MAERSK LINE',
      navire: 'MARCO POLO',
      portEmbarquement: 'ROTTERDAM',
      portDebarquement: 'ABIDJAN',
      dateArrivee: '2025-01-15',
      marchandises: [{
        codeSH: '8703.21.10',
        designation: 'Véhicule particulier Toyota Corolla',
        poidsBrut: 1500.00,
        nombreColis: 1,
        destinataire: 'IMPORT SARL OUAGADOUGOU',
        paysDestination: 'BFA'
      }]
    });

    // Simuler transmission réussie
    this.enregistrerTransmissionKit(manifesteTest.id, {
      status: 'SUCCESS',
      message: 'Manifeste transmis avec succès',
      latence: 245
    }, true);

    console.log('🧪 Données de test générées');
  }
}

// Instance singleton
const database = new PaysADatabase();

// Générer quelques données de test au démarrage
database.genererDonneesTest();

module.exports = database;