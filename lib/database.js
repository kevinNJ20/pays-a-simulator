// Simulation base de données en mémoire
class Database {
    constructor() {
      this.manifestes = new Map();
      this.autorisations = new Map();
      this.statistiques = {
        manifestesTraites: 0,
        autorisationsRecues: 0,
        derniereMiseAJour: new Date()
      };
      
      // Données de test
      this.initTestData();
    }
  
    initTestData() {
      const manifesteTest = {
        id: 'MAN2025001',
        transporteur: 'MAERSK LINE',
        navire: 'MARCO POLO',
        portEmbarquement: 'ROTTERDAM',
        portDebarquement: 'ABIDJAN',
        dateArrivee: '2025-01-15',
        statut: 'EN_ATTENTE_MAINLEVEE',
        marchandises: [
          {
            position: 1,
            codeSH: '8703.21.10',
            designation: 'Véhicule particulier Toyota Corolla',
            poidsBrut: 1500.00,
            nombreColis: 1,
            destinataire: 'IMPORT SARL OUAGADOUGOU',
            paysDestination: 'BFA'
          }
        ],
        dateCreation: new Date()
      };
      
      this.manifestes.set('MAN2025001', manifesteTest);
    }
  
    // Gestion des manifestes
    creerManifeste(manifeste) {
      const id = manifeste.numeroManifeste || `MAN${Date.now()}`;
      const nouveauManifeste = {
        ...manifeste,
        id,
        statut: 'CREE',
        dateCreation: new Date()
      };
      
      this.manifestes.set(id, nouveauManifeste);
      this.statistiques.manifestesTraites++;
      return nouveauManifeste;
    }
  
    getManifeste(id) {
      return this.manifestes.get(id);
    }
  
    getAllManifestes() {
      return Array.from(this.manifestes.values());
    }
  
    // Gestion des autorisations de mainlevée
    recevoirAutorisation(autorisation) {
      const id = autorisation.referenceAutorisation || `AUTH${Date.now()}`;
      const nouvelleAutorisation = {
        ...autorisation,
        id,
        dateReception: new Date(),
        statut: 'RECUE'
      };
      
      this.autorisations.set(id, nouvelleAutorisation);
      this.statistiques.autorisationsRecues++;
      
      // Mettre à jour le statut du manifeste
      const manifeste = this.manifestes.get(autorisation.numeroManifeste);
      if (manifeste) {
        manifeste.statut = 'MAINLEVEE_AUTORISEE';
        manifeste.autorisationMainlevee = nouvelleAutorisation;
      }
      
      return nouvelleAutorisation;
    }
  
    getStatistiques() {
      return {
        ...this.statistiques,
        derniereMiseAJour: new Date()
      };
    }
  }
  
  // Instance singleton
  const db = new Database();
  module.exports = db;