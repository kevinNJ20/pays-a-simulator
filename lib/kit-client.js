const axios = require('axios');

class KitInterconnexionClient {
  constructor() {
    this.baseURL = 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io/api/v1';
    this.timeout = 30000; // 30 secondes
    this.paysCode = 'CIV'; // Côte d'Ivoire
    this.systemeName = 'PAYS_A_DOUANES';
    
    // Configuration Axios avec retry automatique
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PaysA-Douanes/1.0',
        'X-Source-Country': this.paysCode,
        'X-Source-System': this.systemeName
      }
    });

    this.setupInterceptors();
    console.log(`🔗 Client Kit initialisé pour ${this.paysCode} - URL: ${this.baseURL}`);
  }

  setupInterceptors() {
    // Intercepteur pour ajouter headers et logging
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        config.headers['X-Correlation-ID'] = `${this.paysCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`📤 [${this.paysCode}] Envoi vers Kit: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error(`❌ [${this.paysCode}] Erreur requête:`, error.message);
        return Promise.reject(error);
      }
    );

    // Intercepteur pour logging des réponses et retry
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        console.log(`📥 [${this.paysCode}] Réponse Kit: ${response.status} (${duration}ms)`);
        
        // Ajouter les métadonnées de timing
        response.metadata = {
          duration,
          timestamp: new Date(),
          correlationId: response.config.headers['X-Correlation-ID']
        };
        
        return response;
      },
      async (error) => {
        const config = error.config;
        const duration = config?.metadata ? Date.now() - config.metadata.startTime : 0;
        
        console.error(`❌ [${this.paysCode}] Erreur Kit (${duration}ms):`, {
          status: error.response?.status,
          message: error.message,
          url: config?.url
        });

        // Retry automatique pour certaines erreurs
        if (this.shouldRetry(error) && !config._retryAttempted) {
          config._retryAttempted = true;
          console.log(`🔄 [${this.paysCode}] Tentative de retry...`);
          
          await this.wait(2000); // Attendre 2 secondes
          return this.client.request(config);
        }

        return Promise.reject(error);
      }
    );
  }

  shouldRetry(error) {
    // Retry sur les erreurs réseau ou serveur temporaires
    return !error.response || 
           error.response.status >= 500 || 
           error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT';
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === TRANSMISSION DE MANIFESTE ===
  async transmettreManifeste(manifeste) {
    try {
      console.log(`🚀 [${this.paysCode}] Transmission manifeste: ${manifeste.numeroManifeste || manifeste.id}`);
      
      const response = await this.client.post('/manifeste/transmission', manifeste);
      
      console.log(`✅ [${this.paysCode}] Manifeste transmis avec succès:`, response.data);
      
      return {
        ...response.data,
        latence: response.metadata.duration,
        timestamp: response.metadata.timestamp,
        correlationId: response.metadata.correlationId
      };
      
    } catch (error) {
      console.error(`❌ [${this.paysCode}] Échec transmission manifeste:`, error.message);
      
      throw new Error(`Transmission manifeste échouée: ${error.response?.data?.message || error.message}`);
    }
  }

  // === VÉRIFICATION SANTÉ ===
  async verifierSante() {
    try {
      console.log(`🏥 [${this.paysCode}] Vérification santé Kit...`);
      
      const response = await this.client.get('/health');
      
      console.log(`✅ [${this.paysCode}] Kit opérationnel:`, response.data.status);
      
      return {
        ...response.data,
        latence: response.metadata.duration,
        accessible: true,
        timestamp: response.metadata.timestamp
      };
      
    } catch (error) {
      console.error(`❌ [${this.paysCode}] Kit inaccessible:`, error.message);
      
      return {
        status: 'DOWN',
        accessible: false,
        erreur: error.message,
        timestamp: new Date(),
        details: {
          code: error.code,
          status: error.response?.status,
          url: this.baseURL
        }
      };
    }
  }

  // === TEST DE CONNECTIVITÉ COMPLET ===
  async testerConnectivite() {
    const startTime = Date.now();
    
    try {
      const sante = await this.verifierSante();
      const duration = Date.now() - startTime;
      
      return {
        success: sante.accessible,
        duree: duration,
        sante,
        kit: {
          url: this.baseURL,
          version: sante.version,
          status: sante.status
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        success: false,
        duree: Date.now() - startTime,
        erreur: error.message,
        kit: {
          url: this.baseURL,
          status: 'INACCESSIBLE'
        },
        timestamp: new Date()
      };
    }
  }

  // === PING SIMPLE ===
  async ping() {
    try {
      const startTime = Date.now();
      await this.client.get('/health');
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Ping failed: ${error.message}`);
    }
  }

  // === INFORMATIONS CLIENT ===
  getClientInfo() {
    return {
      pays: {
        code: this.paysCode,
        nom: 'Côte d\'Ivoire',
        type: 'COTIER'
      },
      kit: {
        url: this.baseURL,
        timeout: this.timeout
      },
      systeme: {
        nom: this.systemeName,
        version: '1.0.0'
      }
    };
  }

  // === DIAGNOSTIC AVANCÉ ===
  async diagnostic() {
    console.log(`🔍 [${this.paysCode}] Démarrage diagnostic Kit...`);
    
    const diagnosticResult = {
      timestamp: new Date(),
      client: this.getClientInfo(),
      tests: {}
    };

    // Test 1: Connectivité de base
    try {
      const connectivite = await this.testerConnectivite();
      diagnosticResult.tests.connectivite = {
        success: connectivite.success,
        duree: connectivite.duree,
        details: connectivite
      };
    } catch (error) {
      diagnosticResult.tests.connectivite = {
        success: false,
        erreur: error.message
      };
    }

    // Test 2: Ping multiple pour mesurer la stabilité
    diagnosticResult.tests.stabilite = await this.testerStabilite();

    // Test 3: Endpoint spécifiques
    diagnosticResult.tests.endpoints = await this.testerEndpoints();

    console.log(`📊 [${this.paysCode}] Diagnostic terminé:`, {
      connectivite: diagnosticResult.tests.connectivite?.success,
      stabilite: diagnosticResult.tests.stabilite?.stable,
      endpoints: diagnosticResult.tests.endpoints?.disponibles
    });

    return diagnosticResult;
  }

  async testerStabilite(nombreTests = 3) {
    const latences = [];
    let erreurs = 0;

    for (let i = 0; i < nombreTests; i++) {
      try {
        const latence = await this.ping();
        latences.push(latence);
        await this.wait(500); // Pause entre les tests
      } catch (error) {
        erreurs++;
      }
    }

    const latenceMoyenne = latences.length > 0 
      ? Math.round(latences.reduce((a, b) => a + b, 0) / latences.length)
      : 0;

    return {
      nombreTests,
      reussites: latences.length,
      erreurs,
      latenceMoyenne,
      latenceMin: latences.length > 0 ? Math.min(...latences) : 0,
      latenceMax: latences.length > 0 ? Math.max(...latences) : 0,
      stable: erreurs === 0 && latenceMoyenne < 5000 // Stable si pas d'erreur et < 5s
    };
  }

  async testerEndpoints() {
    const endpoints = [
      { nom: 'Health', path: '/health', methode: 'GET' },
      { nom: 'Console', path: '/console', methode: 'GET' }
    ];

    const resultats = {};

    for (const endpoint of endpoints) {
      try {
        const response = await this.client({
          method: endpoint.methode,
          url: endpoint.path
        });
        
        resultats[endpoint.nom] = {
          disponible: true,
          status: response.status,
          latence: response.metadata?.duration
        };
      } catch (error) {
        resultats[endpoint.nom] = {
          disponible: false,
          erreur: error.response?.status || error.message
        };
      }
    }

    const disponibles = Object.values(resultats).filter(r => r.disponible).length;
    
    return {
      ...resultats,
      disponibles: `${disponibles}/${endpoints.length}`
    };
  }
}

// Instance singleton
const kitClient = new KitInterconnexionClient();

module.exports = kitClient;