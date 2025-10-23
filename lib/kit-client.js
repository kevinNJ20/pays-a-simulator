// ============================================================================
// SÉNÉGAL - Kit Client CORRIGÉ selon rapport PDF UEMOA
// Pays de prime abord - Port de Dakar
// Simulation étapes 4-5 du workflow (transmission vers pays de destination)
// ============================================================================

const axios = require('axios');

class KitInterconnexionClient {
  constructor() {
    // ✅ URL Kit MuleSoft pour Sénégal
    this.baseURL = process.env.KIT_MULESOFT_URL || 'http://localhost:8086/api/v1';
    this.timeout = 90000;
    this.paysCode = 'SEN';
    this.systemeName = 'SENEGAL_DOUANES_DAKAR';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Senegal-Douanes-Dakar/1.0',
        'X-Source-Country': this.paysCode,
        'X-Source-System': this.systemeName,
        'X-Source-Port': 'PORT_DAKAR',
        'X-Manifeste-Format': 'UEMOA',
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 600;
      }
    });

    this.setupInterceptors();
    console.log(`🇸🇳 [SÉNÉGAL] Kit Client Dakar configuré:`);
    console.log(`   URL: ${this.baseURL}`);
    console.log(`   Port: Port de Dakar`);
    console.log(`   Rôle: Pays de prime abord`);
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        const correlationId = `SEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        config.headers['X-Correlation-ID'] = correlationId;
        
        if (!config.headers['X-Manifeste-Format']) {
          config.headers['X-Manifeste-Format'] = 'UEMOA';
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🚀 [SÉNÉGAL → KIT] ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`🏗️ [SÉNÉGAL → KIT] Port de Dakar → Kit d'Interconnexion`);
        console.log(`⏱️  [SÉNÉGAL → KIT] Timeout: ${config.timeout || this.timeout}ms`);
        console.log(`🆔 [SÉNÉGAL → KIT] Correlation ID: ${correlationId}`);
        console.log(`📋 [SÉNÉGAL → KIT] Manifeste Format: ${config.headers['X-Manifeste-Format']}`);
        
        if (config.data) {
          console.log(`📦 [SÉNÉGAL → KIT] Payload (${JSON.stringify(config.data).length} chars):`);
          console.log(JSON.stringify(config.data, null, 2));
        }
        
        return config;
      },
      (error) => {
        console.error(`❌ [SÉNÉGAL → KIT] Erreur config requête:`, error.message);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        
        console.log(`📥 [KIT → SÉNÉGAL] Réponse reçue: ${response.status} ${response.statusText} (${duration}ms)`);
        console.log(`🏗️ [KIT → SÉNÉGAL] Kit → Port de Dakar`);
        
        if (response.data) {
          console.log(`📦 [KIT → SÉNÉGAL] Données réponse (${JSON.stringify(response.data).length} chars):`);
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
        console.error(`❌ [KIT → SÉNÉGAL] ERREUR après ${duration}ms:`);
        console.error(`   Port: Port de Dakar`);
        console.error(`   Status: ${error.response?.status || 'N/A'}`);
        console.error(`   Message: ${error.message}`);
        
        if (error.response?.data) {
          console.error(`   Détails MuleSoft:`, JSON.stringify(error.response.data, null, 2));
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return Promise.reject(error);
      }
    );
  }

  // ✅ ÉTAPES 4-5 : Transmission manifeste vers pays de destination (Mali)
  async transmettreManifeste(manifeste) {
    try {
      console.log(`\n🇸🇳 [SÉNÉGAL] ═══ ÉTAPES 4-5 : TRANSMISSION VERS PAYS DE DESTINATION ═══`);
      console.log(`🎯 [SÉNÉGAL] Manifeste: ${manifeste.numeroManifeste || manifeste.numero_manif}`);
      console.log(`🏗️ [SÉNÉGAL] Port de Dakar → Kit → Mali (Bamako)`);
      
      this.validerManifesteSenegal(manifeste);
      
      const extractionManifeste = this.preparerExtractionPourDestination(manifeste);
      
      console.log(`🚀 [SÉNÉGAL] Envoi extraction vers Kit MuleSoft: POST /manifeste/transmission`);
      
      const startTime = Date.now();
      
      const response = await this.client.post('/manifeste/transmission', extractionManifeste, {
        headers: {
          'X-Source-Country': 'SEN',
          'X-Source-System': 'SENEGAL_DOUANES_DAKAR',
          'X-Manifeste-Format': 'UEMOA',
          'X-Correlation-ID': `SEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`🎉 [SÉNÉGAL] ═══ ÉTAPES 4-5 RÉUSSIES ═══`);
        console.log(`✅ [SÉNÉGAL] Extraction transmise avec succès (${duration}ms)`);
        console.log(`🎯 [SÉNÉGAL] Kit va maintenant router vers Mali (Bamako)`);
        console.log(`📋 [SÉNÉGAL] Manifeste: ${manifeste.numeroManifeste || manifeste.numero_manif}`);
        console.log(`⏳ [SÉNÉGAL] Attente traitement par Mali (étapes 6-16)`);
        
        return {
          ...response.data,
          latence: duration,
          timestamp: new Date(),
          correlationId: response.metadata?.correlationId,
          success: true,
          statusCode: response.status,
          paysOrigine: 'SÉNÉGAL',
          portOrigine: 'Port de Dakar',
          paysDestination: this.extrairePaysDestinations(manifeste)
        };
      } else {
        throw new Error(`Réponse Kit MuleSoft inattendue: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error(`\n💥 [SÉNÉGAL] ═══ ÉCHEC ÉTAPES 4-5 ═══`);
      console.error(`❌ [SÉNÉGAL] Erreur: ${error.message}`);
      console.error(`❌ [SÉNÉGAL] Manifeste: ${manifeste.numeroManifeste || manifeste.numero_manif}`);
      console.error(`❌ [SÉNÉGAL] Pays de destination NE RECEVRA PAS l'extraction`);
      
      if (error.response?.data) {
        console.error(`❌ [SÉNÉGAL] Détails erreur MuleSoft:`, error.response.data);
      }
      
      const enrichedError = new Error(`Kit MuleSoft transmission failed from Dakar: ${error.message}`);
      enrichedError.originalError = error;
      enrichedError.manifesteId = manifeste.numeroManifeste || manifeste.numero_manif;
      enrichedError.kitUrl = this.baseURL;
      enrichedError.statusCode = error.response?.status;
      enrichedError.retryRecommended = this.shouldRetry(error);
      enrichedError.paysOrigine = 'SÉNÉGAL';
      enrichedError.portOrigine = 'Port de Dakar';
      enrichedError.muleSoftError = error.response?.data;
      
      throw enrichedError;
    }
  }

  validerManifesteSenegal(manifeste) {
    console.log(`🔍 [SÉNÉGAL] Validation manifeste Port de Dakar...`);
    
    if (!manifeste) {
      throw new Error('Manifeste null - impossible de transmettre depuis Port de Dakar');
    }
    
    const format = this.detecterFormatManifeste(manifeste);
    console.log(`🔍 [SÉNÉGAL] Format détecté: ${format}`);
    
    if (format === 'UEMOA') {
      if (!manifeste.numero_manif) {
        throw new Error('numero_manif requis pour transmission depuis Port de Dakar');
      }
      
      if (!manifeste.consignataire || manifeste.consignataire.trim() === '') {
        throw new Error('consignataire requis pour manifeste Sénégal');
      }
      
      if (!manifeste.articles || !Array.isArray(manifeste.articles) || manifeste.articles.length === 0) {
        throw new Error('Articles requis pour transmission depuis Port de Dakar');
      }
      
      const articlesAvecDestination = manifeste.articles.filter(article => 
        article.pays_dest && article.pays_dest.trim() !== '' && article.pays_dest !== 'SÉNÉGAL'
      );
      
      if (articlesAvecDestination.length === 0) {
        throw new Error('Aucune marchandise destinée à un pays de destination trouvée');
      }
      
      console.log(`✅ [SÉNÉGAL] Manifeste UEMOA validé pour Port de Dakar:`);
      console.log(`   📋 Numéro: ${manifeste.numero_manif}`);
      console.log(`   🚚 Consignataire: ${manifeste.consignataire}`);
      console.log(`   📦 Articles: ${manifeste.articles.length} (${articlesAvecDestination.length} pour pays destination)`);
      console.log(`   🎯 Destinations: ${articlesAvecDestination.map(a => a.pays_dest).join(', ')}`);
      
    } else {
      throw new Error(`Format non supporté pour transmission depuis Sénégal: ${format}`);
    }
  }

  preparerExtractionPourDestination(manifeste) {
    console.log(`🔧 [SÉNÉGAL] Préparation extraction pour pays de destination...`);
    
    const articlesDestination = manifeste.articles.filter(article => 
      article.pays_dest && 
      article.pays_dest.trim() !== '' && 
      article.pays_dest !== 'SÉNÉGAL'
    );
    
    const extraction = {
      annee_manif: manifeste.annee_manif,
      bureau_manif: manifeste.bureau_manif,
      numero_manif: manifeste.numero_manif,
      code_cgt: manifeste.code_cgt,
      consignataire: manifeste.consignataire,
      repertoire: manifeste.repertoire,
      
      navire: manifeste.navire,
      provenance: manifeste.provenance,
      pavillon: manifeste.pavillon,
      date_arrivee: manifeste.date_arrivee,
      valapprox: manifeste.valapprox,
      
      paysOrigine: 'SENEGAL',
      portDebarquement: 'Port de Dakar',
      typeManifeste: 'EXTRACTION_LIBRE_PRATIQUE',
      
      nbre_article: articlesDestination.length,
      articles: articlesDestination,
      
      etapeWorkflow: 5,
      dateTransmission: new Date().toISOString(),
      workflow: 'LIBRE_PRATIQUE'
    };
    
    console.log(`✅ [SÉNÉGAL] Extraction préparée:`);
    console.log(`   📋 Manifeste origine: ${extraction.numero_manif} (${extraction.annee_manif})`);
    console.log(`   🏗️ Port origine: ${extraction.portDebarquement}`);
    console.log(`   📦 Articles pour destination: ${extraction.nbre_article}`);
    console.log(`   🎯 Pays destinations: ${articlesDestination.map(a => a.pays_dest).join(', ')}`);
    
    return extraction;
  }

  extrairePaysDestinations(manifeste) {
    if (!manifeste.articles || !Array.isArray(manifeste.articles)) {
      return [];
    }
    
    return [...new Set(
      manifeste.articles
        .map(article => article.pays_dest)
        .filter(pays => pays && pays.trim() !== '' && pays !== 'SÉNÉGAL')
    )];
  }

  detecterFormatManifeste(manifeste) {
    if (!manifeste || typeof manifeste !== 'object') {
      return 'UNKNOWN';
    }
    
    const champsUEMOA = ['numero_manif', 'consignataire', 'articles'];
    const hasUEMOAFields = champsUEMOA.some(champ => manifeste.hasOwnProperty(champ));
    
    return hasUEMOAFields ? 'UEMOA' : 'UNKNOWN';
  }

  async verifierSante() {
    try {
      console.log(`🏥 [SÉNÉGAL] Test santé Kit MuleSoft: GET /health`);
      
      const startTime = Date.now();
      const response = await this.client.get('/health', {
        timeout: 30000
      });
      
      const duration = Date.now() - startTime;
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ [SÉNÉGAL] Kit MuleSoft opérationnel (${duration}ms)`);
        
        return {
          ...response.data,
          latence: duration,
          accessible: true,
          timestamp: new Date(),
          source: 'MULESOFT_DIRECT',
          paysOrigine: 'SÉNÉGAL',
          portOrigine: 'Port de Dakar'
        };
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
    } catch (error) {
      const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());
      
      console.error(`❌ [SÉNÉGAL] Kit MuleSoft inaccessible (${duration}ms):`);
      console.error(`   Erreur: ${error.message}`);
      console.error(`   Port: Port de Dakar`);
      
      return {
        status: 'DOWN',
        accessible: false,
        erreur: error.message,
        latence: duration,
        timestamp: new Date(),
        source: 'MULESOFT_DIRECT',
        paysOrigine: 'SÉNÉGAL',
        portOrigine: 'Port de Dakar'
      };
    }
  }

  async ping() {
    const startTime = Date.now();
    await this.client.get('/health', {
      timeout: 15000
    });
    return Date.now() - startTime;
  }

  // ✅ CORRECTION: Notification apurement avec header X-Payment-Reference requis
  async notifierApurement(apurementData) {
    try {
      console.log(`🔓 [SÉNÉGAL] Notification apurement vers Kit: ${apurementData.numeroManifeste}`);
      
      const notificationApurement = {
        numeroManifeste: apurementData.numeroManifeste,
        referencePaiement: apurementData.referencePaiement,
        typeApurement: apurementData.typeApurement || 'LEVEE_MARCHANDISE',
        dateApurement: apurementData.dateApurement instanceof Date ? 
                       apurementData.dateApurement.toISOString() : apurementData.dateApurement,
        paysApurement: 'SEN',
        portApurement: 'Port de Dakar',
        agentConfirmation: apurementData.agentConfirmation,
        typeConfirmation: apurementData.typeConfirmation,
        observations: apurementData.observations || '',
        bonEnlever: apurementData.bonEnlever
      };
      
      // ✅ CORRECTION: Ajout du header X-Payment-Reference requis par MuleSoft
      const response = await this.client.post('/apurement/notification', notificationApurement, {
        headers: {
          'X-Source-Country': 'SEN',
          'X-Source-System': 'SENEGAL_DOUANES_DAKAR',
          'X-Payment-Reference': apurementData.referencePaiement || 'N/A',
          'X-Correlation-ID': `SEN_APU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });
      
      console.log(`✅ [SÉNÉGAL] Apurement notifié avec succès:`, response.data);
      
      return {
        ...response.data,
        latence: response.metadata.duration,
        timestamp: response.metadata.timestamp,
        correlationId: response.metadata.correlationId,
        source: 'MULESOFT_DIRECT',
        success: true
      };
      
    } catch (error) {
      console.error(`❌ [SÉNÉGAL] Échec notification apurement:`, error.message);
      
      // ✅ Amélioration: Afficher détails erreur MuleSoft si disponibles
      if (error.response?.data) {
        console.error(`❌ [SÉNÉGAL] Détails MuleSoft:`, JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(`Notification apurement échouée depuis Dakar: ${error.response?.data?.message || error.message}`);
    }
  }

  async transmettreTransit(transit) {
    try {
      console.log(`\n🚛 [SÉNÉGAL] ═══ ÉTAPES 10-11 : TRANSMISSION TRANSIT VERS MALI ═══`);
      console.log(`🎯 [SÉNÉGAL] Transit: ${transit.numeroDeclaration}`);
      console.log(`🏗️ [SÉNÉGAL] Port de Dakar → Kit → Mali (Bamako)`);
      
      // Validation transit Sénégal
      if (!transit.numeroDeclaration) {
        throw new Error('Numéro déclaration transit requis');
      }
      
      if (!transit.paysDestination) {
        throw new Error('Pays destination requis pour transit');
      }
      
      // ✅ CORRECTION: Préparation données pour endpoint /transit/creation de MuleSoft
      const transitPayload = {
        numeroDeclaration: transit.numeroDeclaration,
        paysDepart: 'SEN',
        paysDestination: transit.paysDestination,
        
        // Informations transit
        bureauDepart: transit.bureauDepart || '18N_DAKAR',
        dateCreation: transit.dateCreation instanceof Date ? 
                     transit.dateCreation.toISOString() : transit.dateCreation,
        transporteur: transit.transporteur,
        modeTransport: transit.modeTransport || 'ROUTIER',
        itineraire: transit.itineraire,
        delaiRoute: transit.delaiRoute || '72 heures',
        
        // Marchandises
        marchandises: (transit.marchandises || []).map(m => ({
          designation: m.designation,
          poids: parseFloat(m.poids) || 0,
          nombreColis: parseInt(m.nombreColis) || 1,
          marques: m.marques || ''
        })),
        
        // Garanties
        cautionRequise: parseFloat(transit.cautionRequise) || 0,
        referenceCaution: transit.referenceCaution || ''
      };
      
      console.log(`🚀 [SÉNÉGAL] Envoi transit vers Kit MuleSoft: POST /transit/creation`);
      
      const startTime = Date.now();
      
      // ✅ CORRECTION: Utiliser /transit/creation au lieu de /transit/copie
      const response = await this.client.post('/transit/creation', transitPayload, {
        headers: {
          'X-Source-Country': 'SEN',
          'X-Source-System': 'SENEGAL_DOUANES_TRANSIT',
          'X-Workflow-Type': 'TRANSIT',
          'X-Workflow-Step': '10-11_TRANSMISSION_TRANSIT',
          'X-Correlation-ID': `TRANSIT_SEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`🎉 [SÉNÉGAL] ═══ ÉTAPES 10-11 RÉUSSIES ═══`);
        console.log(`✅ [SÉNÉGAL] Transit transmis avec succès (${duration}ms)`);
        console.log(`🎯 [SÉNÉGAL] Kit va transmettre vers Mali (Bamako)`);
        console.log(`⏳ [SÉNÉGAL] Attente message arrivée Mali (étapes 13-14)`);
        
        return {
          ...response.data,
          latence: duration,
          timestamp: new Date(),
          correlationId: response.metadata?.correlationId,
          success: true,
          statusCode: response.status,
          paysOrigine: 'SÉNÉGAL',
          portOrigine: 'Port de Dakar',
          typeOperation: 'TRANSMISSION_TRANSIT'
        };
      } else {
        throw new Error(`Réponse Kit MuleSoft inattendue: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`\n💥 [SÉNÉGAL] ═══ ÉCHEC ÉTAPES 10-11 ═══`);
      console.error(`❌ [SÉNÉGAL] Erreur: ${error.message}`);
      console.error(`❌ [SÉNÉGAL] Mali NE RECEVRA PAS le transit`);
      
      if (error.response?.data) {
        console.error(`❌ [SÉNÉGAL] Détails erreur MuleSoft:`, error.response.data);
      }
      
      const enrichedError = new Error(`Kit MuleSoft transit transmission failed: ${error.message}`);
      enrichedError.originalError = error;
      enrichedError.transitId = transit.numeroDeclaration;
      enrichedError.kitUrl = this.baseURL;
      enrichedError.statusCode = error.response?.status;
      enrichedError.retryRecommended = this.shouldRetry(error);
      enrichedError.paysOrigine = 'SÉNÉGAL';
      enrichedError.portOrigine = 'Port de Dakar';
      
      throw enrichedError;
    }
  }


  shouldRetry(error) {
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 || status === 429 || status === 408;
  }

  getClientInfo() {
    return {
      pays: { 
        code: this.paysCode, 
        nom: 'Sénégal', 
        ville: 'Dakar',
        type: 'COTIER',
        role: 'PAYS_PRIME_ABORD'
      },
      kit: { 
        url: this.baseURL, 
        timeout: this.timeout, 
        modeConnexion: 'DIRECT_MULESOFT' 
      },
      systeme: { 
        nom: this.systemeName, 
        version: '1.0.0',
        port: 'Port de Dakar'
      },
      formatSupporte: 'UEMOA_2025.1',
      workflowsSupporte: ['LIBRE_PRATIQUE', 'TRANSIT']
    };
  }
}

const kitClient = new KitInterconnexionClient();

module.exports = kitClient;