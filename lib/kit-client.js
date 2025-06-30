const axios = require('axios');

class KitInterconnexionClient {
  constructor() {
    // ✅ URL Kit MuleSoft - VÉRIFIÉE
    this.baseURL = 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io/api/v1';
    this.timeout = 90000; // ✅ 90 secondes pour CloudHub cold start
    this.paysCode = 'CIV';
    this.systemeName = 'PAYS_A_DOUANES';
    
    // ✅ Configuration Axios spécialisée pour Kit MuleSoft
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PaysA-Douanes/1.0',
        'X-Source-Country': this.paysCode,
        'X-Source-System': this.systemeName,
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 600; // ✅ Accepter toutes les réponses pour debug
      }
    });

    this.setupInterceptors();
    console.log(`🔗 [DEBUG] Kit Client configuré:`);
    console.log(`   URL: ${this.baseURL}`);
    console.log(`   Timeout: ${this.timeout}ms`);
    console.log(`   Pays: ${this.paysCode}`);
  }

  setupInterceptors() {
    // ✅ INTERCEPTEUR REQUEST - Debug complet
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        const correlationId = `${this.paysCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        config.headers['X-Correlation-ID'] = correlationId;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🚀 [PAYS A → KIT] ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`🔗 [PAYS A → KIT] URL complète: ${config.baseURL}${config.url}`);
        console.log(`⏱️  [PAYS A → KIT] Timeout: ${config.timeout || this.timeout}ms`);
        console.log(`🆔 [PAYS A → KIT] Correlation ID: ${correlationId}`);
        console.log(`📋 [PAYS A → KIT] Headers:`, JSON.stringify(config.headers, null, 2));
        
        if (config.data) {
          console.log(`📦 [PAYS A → KIT] Payload (${JSON.stringify(config.data).length} chars):`);
          console.log(JSON.stringify(config.data, null, 2));
        }
        
        return config;
      },
      (error) => {
        console.error(`❌ [PAYS A → KIT] Erreur config requête:`, error.message);
        return Promise.reject(error);
      }
    );

    // ✅ INTERCEPTEUR RESPONSE - Debug complet  
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        
        console.log(`📥 [KIT → PAYS A] Réponse reçue: ${response.status} ${response.statusText} (${duration}ms)`);
        console.log(`📋 [KIT → PAYS A] Headers réponse:`, JSON.stringify(response.headers, null, 2));
        
        if (response.data) {
          console.log(`📦 [KIT → PAYS A] Données réponse (${JSON.stringify(response.data).length} chars):`);
          console.log(JSON.stringify(response.data, null, 2));
        }
        
        response.metadata = {
          duration,
          timestamp: new Date(),
          correlationId: response.config.headers['X-Correlation-ID']
        };
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return response;
      },
      (error) => {
        const config = error.config;
        const duration = config?.metadata ? Date.now() - config.metadata.startTime : 0;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`❌ [KIT → PAYS A] ERREUR après ${duration}ms:`);
        console.error(`   Status: ${error.response?.status || 'N/A'}`);
        console.error(`   Status Text: ${error.response?.statusText || 'N/A'}`);
        console.error(`   Error Code: ${error.code || 'N/A'}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   URL: ${config?.url}`);
        
        if (error.response?.data) {
          console.error(`   Réponse erreur:`, JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.headers) {
          console.error(`   Headers erreur:`, JSON.stringify(error.response.headers, null, 2));
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return Promise.reject(error);
      }
    );
  }

  // ✅ TRANSMISSION MANIFESTE avec validation et debug maximal
  async transmettreManifeste(manifeste) {
    try {
      console.log(`\n🎯 [PAYS A] DÉBUT TRANSMISSION MANIFESTE: ${manifeste.numeroManifeste || manifeste.id}`);
      
      // ✅ ÉTAPE 1: Validation des données d'entrée
      this.validerManifeste(manifeste);
      
      // ✅ ÉTAPE 2: Préparation payload pour Kit MuleSoft
      const manifesteForKit = this.preparerPayloadKit(manifeste);
      
      // ✅ ÉTAPE 3: Test de connectivité préalable (optionnel mais recommandé)
      console.log(`🔍 [PAYS A] Test connectivité Kit MuleSoft...`);
      try {
        await this.ping();
        console.log(`✅ [PAYS A] Kit MuleSoft accessible - Transmission en cours...`);
      } catch (pingError) {
        console.warn(`⚠️ [PAYS A] Kit MuleSoft ping échoué: ${pingError.message} - Tentative transmission quand même...`);
      }
      
      // ✅ ÉTAPE 4: Transmission principale
      console.log(`🚀 [PAYS A] Envoi vers Kit MuleSoft: POST /manifeste/transmission`);
      
      const startTime = Date.now();
      const response = await this.client.post('/manifeste/transmission', manifesteForKit, {
        timeout: 120000, // ✅ 2 minutes pour cette opération critique
        headers: {
          'X-Operation': 'MANIFESTE_TRANSMISSION',
          'X-Pays-Origine': 'CIV',
          'X-Timestamp': new Date().toISOString()
        }
      });
      
      const duration = Date.now() - startTime;
      
      // ✅ ÉTAPE 5: Validation de la réponse
      if (response.status >= 200 && response.status < 300) {
        console.log(`🎉 [PAYS A] TRANSMISSION RÉUSSIE vers Kit MuleSoft (${duration}ms):`);
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   ✅ Manifeste: ${manifeste.numeroManifeste}`);
        console.log(`   ✅ Corrélation: ${response.metadata?.correlationId}`);
        console.log(`   ✅ Kit devrait maintenant insérer dans Supabase`);
        
        return {
          ...response.data,
          latence: duration,
          timestamp: new Date(),
          correlationId: response.metadata?.correlationId,
          success: true,
          statusCode: response.status
        };
      } else {
        throw new Error(`Réponse Kit MuleSoft inattendue: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error(`\n💥 [PAYS A] ÉCHEC TRANSMISSION MANIFESTE: ${manifeste.numeroManifeste || manifeste.id}`);
      console.error(`   ❌ Erreur: ${error.message}`);
      console.error(`   ❌ Code: ${error.code || 'N/A'}`);
      console.error(`   ❌ Status: ${error.response?.status || 'N/A'}`);
      console.error(`   ❌ URL: ${this.baseURL}/manifeste/transmission`);
      console.error(`   ❌ Supabase NE SERA PAS mis à jour`);
      
      // ✅ Enrichir l'erreur avec le contexte
      const enrichedError = new Error(`Kit MuleSoft transmission failed: ${error.message}`);
      enrichedError.originalError = error;
      enrichedError.manifesteId = manifeste.numeroManifeste || manifeste.id;
      enrichedError.kitUrl = this.baseURL;
      enrichedError.statusCode = error.response?.status;
      enrichedError.retryRecommended = this.shouldRetry(error);
      
      throw enrichedError;
    }
  }

  // ✅ VALIDATION du manifeste avant envoi
  validerManifeste(manifeste) {
    console.log(`🔍 [PAYS A] Validation manifeste avant transmission...`);
    
    if (!manifeste) {
      throw new Error('Manifeste null ou undefined');
    }
    
    if (!manifeste.numeroManifeste) {
      throw new Error('numeroManifeste requis pour Kit MuleSoft');
    }
    
    if (!manifeste.marchandises || !Array.isArray(manifeste.marchandises) || manifeste.marchandises.length === 0) {
      throw new Error('Au moins une marchandise requise pour Kit MuleSoft');
    }
    
    manifeste.marchandises.forEach((marchandise, index) => {
      if (!marchandise.paysDestination) {
        throw new Error(`Marchandise ${index + 1}: paysDestination requis pour Kit MuleSoft`);
      }
    });
    
    console.log(`✅ [PAYS A] Manifeste validé pour Kit MuleSoft`);
  }

  // ✅ PRÉPARATION du payload selon les attentes du Kit MuleSoft
  preparerPayloadKit(manifeste) {
    console.log(`🔧 [PAYS A] Préparation payload pour Kit MuleSoft...`);
    
    const manifesteForKit = {
      numeroManifeste: manifeste.numeroManifeste,
      transporteur: manifeste.transporteur || '',
      navire: manifeste.navire || '',
      portEmbarquement: manifeste.portEmbarquement || '',
      portDebarquement: manifeste.portDebarquement || '',
      dateArrivee: manifeste.dateArrivee,
      marchandises: manifeste.marchandises.map((marchandise, index) => ({
        codeSH: marchandise.codeSH || '',
        designation: marchandise.designation || `Marchandise ${index + 1}`,
        poidsBrut: parseFloat(marchandise.poidsBrut) || 0,
        nombreColis: parseInt(marchandise.nombreColis) || 1,
        destinataire: marchandise.destinataire || '',
        paysDestination: marchandise.paysDestination
      }))
    };
    
    console.log(`✅ [PAYS A] Payload Kit préparé (${JSON.stringify(manifesteForKit).length} chars)`);
    return manifesteForKit;
  }

  // ✅ VÉRIFICATION SANTÉ avec logging détaillé
  async verifierSante() {
    try {
      console.log(`🏥 [PAYS A] Test santé Kit MuleSoft: GET /health`);
      
      const startTime = Date.now();
      const response = await this.client.get('/health', {
        timeout: 30000 // ✅ 30s pour health check
      });
      
      const duration = Date.now() - startTime;
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ [PAYS A] Kit MuleSoft opérationnel (${duration}ms)`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Version: ${response.data?.version || 'N/A'}`);
        console.log(`   Service: ${response.data?.service || 'N/A'}`);
        
        return {
          ...response.data,
          latence: duration,
          accessible: true,
          timestamp: new Date(),
          source: 'MULESOFT_DIRECT'
        };
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
    } catch (error) {
      const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());
      
      console.error(`❌ [PAYS A] Kit MuleSoft inaccessible (${duration}ms):`);
      console.error(`   Erreur: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      console.error(`   Status: ${error.response?.status || 'N/A'}`);
      
      return {
        status: 'DOWN',
        accessible: false,
        erreur: error.message,
        latence: duration,
        timestamp: new Date(),
        source: 'MULESOFT_DIRECT',
        details: {
          code: error.code,
          status: error.response?.status,
          url: this.baseURL
        }
      };
    }
  }

  // ✅ PING rapide pour test de connectivité
  async ping() {
    const startTime = Date.now();
    await this.client.get('/health', {
      timeout: 15000 // ✅ 15s pour ping rapide
    });
    return Date.now() - startTime;
  }

  // ✅ TEST de connectivité complet
  async testerConnectiviteComplète() {
    console.log(`\n🔬 [PAYS A] TEST CONNECTIVITÉ COMPLÈTE vers Kit MuleSoft`);
    
    const resultats = {
      urlKit: this.baseURL,
      timestamp: new Date(),
      tests: {}
    };
    
    // Test 1: Health check
    try {
      const health = await this.verifierSante();
      resultats.tests.health = {
        success: health.accessible,
        latence: health.latence,
        details: health
      };
    } catch (error) {
      resultats.tests.health = {
        success: false,
        erreur: error.message
      };
    }
    
    // Test 2: Test transmission factice (si health OK)
    if (resultats.tests.health.success) {
      try {
        const manifesteTest = {
          numeroManifeste: `TEST_CONNECTIVITY_${Date.now()}`,
          transporteur: 'TEST TRANSPORT',
          dateArrivee: new Date().toISOString().split('T')[0],
          marchandises: [{
            designation: 'Test connectivité',
            poidsBrut: 1,
            nombreColis: 1,
            paysDestination: 'BFA'
          }]
        };
        
        console.log(`🧪 [PAYS A] Test transmission factice...`);
        await this.transmettreManifeste(manifesteTest);
        
        resultats.tests.transmission = {
          success: true,
          message: 'Test transmission réussi'
        };
        
      } catch (error) {
        resultats.tests.transmission = {
          success: false,
          erreur: error.message
        };
      }
    }
    
    console.log(`📊 [PAYS A] Résultats test connectivité:`, resultats);
    return resultats;
  }

  // ✅ Déterminer si retry recommandé
  shouldRetry(error) {
    if (!error.response) return true; // Erreurs réseau
    const status = error.response.status;
    return status >= 500 || status === 429 || status === 408;
  }

  getClientInfo() {
    return {
      pays: { code: this.paysCode, nom: 'Côte d\'Ivoire', type: 'COTIER' },
      kit: { url: this.baseURL, timeout: this.timeout, modeConnexion: 'DIRECT_MULESOFT' },
      systeme: { nom: this.systemeName, version: '1.0.0' }
    };
  }
}

// Instance singleton
const kitClient = new KitInterconnexionClient();

module.exports = kitClient;