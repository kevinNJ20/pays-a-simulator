const axios = require('axios');

class KitInterconnexionClient {
  constructor() {
    // ✅ URL Kit MuleSoft - VÉRIFIÉE
    this.baseURL = 'http://localhost:8080/api/v1';
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
      
      // ✅ ÉTAPE 2: Préparation payload FORMAT UEMOA pour Kit MuleSoft
      const manifesteForKit = this.preparerPayloadKitUEMOA(manifeste);
      
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
      const response = await this.client.post('/manifeste/transmission', manifesteForKit);
      
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

  // ✅ VALIDATION du manifeste avant envoi - VERSION ROBUSTE
  validerManifeste(manifeste) {
    console.log(`🔍 [PAYS A] Validation manifeste avant transmission...`);
    console.log(`📋 [PAYS A] Manifeste reçu:`, JSON.stringify(manifeste, null, 2));
    
    if (!manifeste) {
      throw new Error('Manifeste null ou undefined - impossible de transmettre au Kit MuleSoft');
    }
    
    // ✅ Validation numeroManifeste avec détails
    const numeroManifeste = manifeste.numeroManifeste || manifeste.id;
    if (!numeroManifeste) {
      console.error('❌ [PAYS A] numeroManifeste manquant:', {
        numeroManifeste: manifeste.numeroManifeste,
        id: manifeste.id,
        manifesteKeys: Object.keys(manifeste)
      });
      throw new Error('numeroManifeste requis pour Kit MuleSoft - veuillez vérifier le champ numéro de manifeste');
    }
    
    if (typeof numeroManifeste !== 'string' || numeroManifeste.trim() === '') {
      throw new Error('numeroManifeste doit être une chaîne non vide pour Kit MuleSoft');
    }
    
    // ✅ Validation transporteur
    if (!manifeste.transporteur || typeof manifeste.transporteur !== 'string' || manifeste.transporteur.trim() === '') {
      console.error('❌ [PAYS A] transporteur invalide:', manifeste.transporteur);
      throw new Error('transporteur requis pour Kit MuleSoft - veuillez vérifier le champ transporteur');
    }
    
    // ✅ Validation marchandises avec détails
    if (!manifeste.marchandises || !Array.isArray(manifeste.marchandises)) {
      console.error('❌ [PAYS A] marchandises invalides:', {
        marchandises: manifeste.marchandises,
        type: typeof manifeste.marchandises,
        isArray: Array.isArray(manifeste.marchandises)
      });
      throw new Error('marchandises doit être un tableau pour Kit MuleSoft');
    }
    
    if (manifeste.marchandises.length === 0) {
      throw new Error('Au moins une marchandise requise pour Kit MuleSoft');
    }
    
    // ✅ Validation détaillée de chaque marchandise
    manifeste.marchandises.forEach((marchandise, index) => {
      console.log(`🔍 [PAYS A] Validation marchandise ${index + 1}:`, marchandise);
      
      if (!marchandise.paysDestination || typeof marchandise.paysDestination !== 'string' || marchandise.paysDestination.trim() === '') {
        console.error(`❌ [PAYS A] Marchandise ${index + 1} - paysDestination invalide:`, marchandise.paysDestination);
        throw new Error(`Marchandise ${index + 1}: paysDestination requis pour routing Kit MuleSoft - veuillez sélectionner le pays de destination`);
      }
      
      if (!marchandise.designation || typeof marchandise.designation !== 'string' || marchandise.designation.trim() === '') {
        console.error(`❌ [PAYS A] Marchandise ${index + 1} - designation invalide:`, marchandise.designation);
        throw new Error(`Marchandise ${index + 1}: designation requise pour Kit MuleSoft - veuillez saisir la description`);
      }
    });
    
    console.log(`✅ [PAYS A] Manifeste validé pour Kit MuleSoft:`);
    console.log(`   📋 Numéro: ${numeroManifeste}`);
    console.log(`   🚚 Transporteur: ${manifeste.transporteur}`);
    console.log(`   📦 Marchandises: ${manifeste.marchandises.length}`);
    console.log(`   🎯 Destinations: ${manifeste.marchandises.map(m => m.paysDestination).join(', ')}`);
  }

  // ✅ CORRECTION CRITIQUE: Préparation du payload FORMAT UEMOA selon les attentes du Kit MuleSoft
  preparerPayloadKitUEMOA(manifeste) {
    console.log(`🔧 [PAYS A] Préparation payload FORMAT UEMOA pour Kit MuleSoft...`);
    console.log(`📋 [PAYS A] Manifeste d'entrée:`, JSON.stringify(manifeste, null, 2));
    
    // ✅ Récupération sécurisée du numeroManifeste
    const numeroManifeste = manifeste.numeroManifeste || manifeste.id || 'MAN' + Date.now();
    console.log(`🔍 [PAYS A] Numéro manifeste détecté: "${numeroManifeste}"`);
    
    // ✅ Extraire l'année du numéro de manifeste ou utiliser l'année courante
    const anneeManif = numeroManifeste.match(/(\d{4})/) ? 
                       numeroManifeste.match(/(\d{4})/)[1] : 
                       new Date().getFullYear().toString();
    
    // ✅ Générer un numéro de manifeste numérique si nécessaire
    const numeroManifNumeric = numeroManifeste.replace(/\D/g, '') || Date.now().toString().slice(-6);
    
    // ✅ Validation des marchandises
    if (!manifeste.marchandises || !Array.isArray(manifeste.marchandises) || manifeste.marchandises.length === 0) {
      throw new Error('Marchandises manquantes pour transformation UEMOA');
    }
    
    // ✅ PAYLOAD FORMAT UEMOA exact selon le Kit MuleSoft
    const manifesteUEMOA = {
      // ✅ Champs UEMOA principaux
      annee_manif: anneeManif,
      bureau_manif: "18N", // Bureau d'Abidjan par défaut
      numero_manif: parseInt(numeroManifNumeric),
      code_cgt: "014", // Code CGT par défaut
      consignataire: manifeste.transporteur || "MAERSK LINE",
      repertoire: "02402", // Répertoire par défaut
      
      // ✅ Informations navire UEMOA
      navire: manifeste.navire || "MARCO POLO",
      provenance: manifeste.portEmbarquement || "ROTTERDAM", 
      pavillon: "LIBÉRIA", // Pavillon par défaut
      date_arrivee: manifeste.dateArrivee || new Date().toISOString().split('T')[0],
      valapprox: 150000, // Valeur approximative par défaut
      
      // ✅ Nombre d'articles
      nbre_article: manifeste.marchandises.length,
      
      // ✅ Articles format UEMOA
      articles: manifeste.marchandises.map((marchandise, index) => {
        console.log(`🔧 [PAYS A] Transformation marchandise ${index + 1}:`, marchandise);
        
        return {
          art: index + 1,
          prec1: 0,
          prec2: 0,
          date_emb: manifeste.dateArrivee || new Date().toISOString().split('T')[0],
          lieu_emb: manifeste.portEmbarquement || "Rotterdam",
          pays_dest: this.mapPaysDestination(marchandise.paysDestination),
          ville_dest: this.getVilleDestination(marchandise.paysDestination),
          connaissement: `${Date.now()}${index}`.slice(-9), // Générer un connaissement
          expediteur: "EXPORT COMPANY LTD", // Expéditeur par défaut
          destinataire: marchandise.destinataire || "IMPORT SARL",
          voie_dest: "Route terrestre", // Voie par défaut pour pays hinterland
          ordre: "BANQUE ATLANTIQUE", // À l'ordre par défaut
          marchandise: marchandise.designation || `Marchandise ${index + 1}`,
          poids: marchandise.poidsBrut || 1500,
          nbre_colis: marchandise.nombreColis || 1,
          marque: "TOYOTA", // Marque par défaut
          mode_cond: "COLIS (PACKAGE)", // Mode conditionnement par défaut
          nbre_conteneur: 1, // Nombre conteneurs par défaut
          
          // ✅ Conteneurs format UEMOA
          conteneurs: [{
            conteneur: `TCLU${Date.now().toString().slice(-7)}`,
            type: "DRS", // Type conteneur par défaut
            taille: "40", // Taille par défaut
            plomb: `AE${Date.now().toString().slice(-7)}` // Plomb généré
          }]
        };
      })
    };
    
    console.log(`✅ [PAYS A] Payload UEMOA préparé:`);
    console.log(`   📋 Numéro: ${manifesteUEMOA.numero_manif} (${manifesteUEMOA.annee_manif})`);
    console.log(`   🏢 Consignataire: ${manifesteUEMOA.consignataire}`);
    console.log(`   🚢 Navire: ${manifesteUEMOA.navire}`);
    console.log(`   📦 Articles: ${manifesteUEMOA.nbre_article}`);
    console.log(`   🎯 Destinations: ${manifesteUEMOA.articles.map(a => a.pays_dest).join(', ')}`);
    console.log(`   📏 Taille payload: ${JSON.stringify(manifesteUEMOA).length} chars`);
    
    return manifesteUEMOA;
  }

  // ✅ Mapper les codes pays vers les noms complets UEMOA
  mapPaysDestination(codePays) {
    const mappingPays = {
      'BFA': 'BURKINA FASO',
      'MLI': 'MALI', 
      'NER': 'NIGER',
      'TCD': 'TCHAD'
    };
    return mappingPays[codePays] || codePays || 'BURKINA FASO';
  }

  // ✅ Obtenir la ville de destination par défaut
  getVilleDestination(codePays) {
    const mappingVilles = {
      'BFA': 'OUAGADOUGOU',
      'MLI': 'BAMAKO',
      'NER': 'NIAMEY', 
      'TCD': 'NDJAMENA'
    };
    return mappingVilles[codePays] || 'OUAGADOUGOU';
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
    
    // Test 2: Test transmission factice UEMOA (si health OK)
    if (resultats.tests.health.success) {
      try {
        const manifesteTestUEMOA = {
          numeroManifeste: `TEST_UEMOA_${Date.now()}`,
          transporteur: 'TEST TRANSPORT UEMOA',
          navire: 'TEST VESSEL',
          portEmbarquement: 'ROTTERDAM',
          portDebarquement: 'ABIDJAN',
          dateArrivee: new Date().toISOString().split('T')[0],
          marchandises: [{
            designation: 'Test connectivité UEMOA',
            poidsBrut: 1500,
            nombreColis: 1,
            destinataire: 'TEST DESTINATAIRE UEMOA',
            paysDestination: 'BFA'
          }]
        };
        
        console.log(`🧪 [PAYS A] Test transmission factice FORMAT UEMOA...`);
        await this.transmettreManifeste(manifesteTestUEMOA);
        
        resultats.tests.transmission = {
          success: true,
          message: 'Test transmission UEMOA réussi'
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
      systeme: { nom: this.systemeName, version: '1.0.0' },
      formatSupporte: 'UEMOA_2025.1'
    };
  }
}

// Instance singleton
const kitClient = new KitInterconnexionClient();

module.exports = kitClient;