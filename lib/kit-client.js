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
    
    // ✅ Détecter le format
    const format = this.detecterFormatManifeste(manifeste);
    console.log(`🔍 [PAYS A] Format détecté pour validation: ${format}`);
    
    if (format === 'UEMOA') {
        // ✅ VALIDATION FORMAT UEMOA
        console.log('🔍 [PAYS A] Validation UEMOA:', {
            numero_manif: manifeste.numero_manif,
            consignataire: manifeste.consignataire,
            date_arrivee: manifeste.date_arrivee,
            articles: manifeste.articles?.length
        });
        
        if (!manifeste.numero_manif) {
            console.error('❌ [PAYS A] numero_manif manquant:', manifeste.numero_manif);
            throw new Error('numero_manif requis pour Kit MuleSoft - veuillez vérifier le champ numéro de manifeste');
        }
        
        if (!manifeste.consignataire || typeof manifeste.consignataire !== 'string' || manifeste.consignataire.trim() === '') {
            console.error('❌ [PAYS A] consignataire invalide:', manifeste.consignataire);
            throw new Error('consignataire requis pour Kit MuleSoft - veuillez vérifier le champ consignataire');
        }
        
        if (!manifeste.articles || !Array.isArray(manifeste.articles)) {
            console.error('❌ [PAYS A] articles invalides:', {
                articles: manifeste.articles,
                type: typeof manifeste.articles,
                isArray: Array.isArray(manifeste.articles)
            });
            throw new Error('articles doit être un tableau pour Kit MuleSoft');
        }
        
        if (manifeste.articles.length === 0) {
            throw new Error('Au moins un article requis pour Kit MuleSoft');
        }
        
        // Validation détaillée des articles
        manifeste.articles.forEach((article, index) => {
            console.log(`🔍 [PAYS A] Validation article ${index + 1}:`, article);
            
            if (!article.pays_dest || typeof article.pays_dest !== 'string' || article.pays_dest.trim() === '') {
                console.error(`❌ [PAYS A] Article ${index + 1} - pays_dest invalide:`, article.pays_dest);
                throw new Error(`Article ${index + 1}: pays_dest requis pour routing Kit MuleSoft - veuillez sélectionner le pays de destination`);
            }
            
            if (!article.marchandise || typeof article.marchandise !== 'string' || article.marchandise.trim() === '') {
                console.error(`❌ [PAYS A] Article ${index + 1} - marchandise invalide:`, article.marchandise);
                throw new Error(`Article ${index + 1}: marchandise requise pour Kit MuleSoft - veuillez saisir la description`);
            }
        });
        
        console.log(`✅ [PAYS A] Manifeste UEMOA validé pour Kit MuleSoft:`);
        console.log(`   📋 Numéro: ${manifeste.numero_manif}`);
        console.log(`   🚚 Consignataire: ${manifeste.consignataire}`);
        console.log(`   📦 Articles: ${manifeste.articles.length}`);
        console.log(`   🎯 Destinations: ${manifeste.articles.map(a => a.pays_dest).join(', ')}`);
        
    } else if (format === 'LEGACY') {
        // ✅ VALIDATION FORMAT LEGACY
        const numeroManifeste = manifeste.numeroManifeste || manifeste.id;
        if (!numeroManifeste) {
            console.error('❌ [PAYS A] numeroManifeste manquant:', {
                numeroManifeste: manifeste.numeroManifeste,
                id: manifeste.id
            });
            throw new Error('numeroManifeste requis pour Kit MuleSoft - veuillez vérifier le champ numéro de manifeste');
        }
        
        if (!manifeste.transporteur || typeof manifeste.transporteur !== 'string' || manifeste.transporteur.trim() === '') {
            console.error('❌ [PAYS A] transporteur invalide:', manifeste.transporteur);
            throw new Error('transporteur requis pour Kit MuleSoft - veuillez vérifier le champ transporteur');
        }
        
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
        
        // Validation détaillée des marchandises
        manifeste.marchandises.forEach((marchandise, index) => {
            console.log(`🔍 [PAYS A] Validation marchandise ${index + 1}:`, marchandise);
            
            if (!marchandise.paysDestination || typeof marchandise.paysDestination !== 'string' || marchandise.paysDestination.trim() === '') {
                console.error(`❌ [PAYS A] Marchandise ${index + 1} - paysDestination invalide:`, marchandise.paysDestination);
                throw new Error(`Marchandise ${index + 1}: paysDestination requis pour routing Kit MuleSoft`);
            }
            
            if (!marchandise.designation || typeof marchandise.designation !== 'string' || marchandise.designation.trim() === '') {
                console.error(`❌ [PAYS A] Marchandise ${index + 1} - designation invalide:`, marchandise.designation);
                throw new Error(`Marchandise ${index + 1}: designation requise pour Kit MuleSoft`);
            }
        });
        
        console.log(`✅ [PAYS A] Manifeste legacy validé pour Kit MuleSoft:`);
        console.log(`   📋 Numéro: ${numeroManifeste}`);
        console.log(`   🚚 Transporteur: ${manifeste.transporteur}`);
        console.log(`   📦 Marchandises: ${manifeste.marchandises.length}`);
        console.log(`   🎯 Destinations: ${manifeste.marchandises.map(m => m.paysDestination).join(', ')}`);
        
    } else {
        console.error('❌ [PAYS A] Format de manifeste non reconnu:', format);
        throw new Error(`Format de manifeste non reconnu: ${format}. Formats supportés: UEMOA, LEGACY`);
    }
}

  // ✅ NOUVELLE FONCTION: Détecter le format du manifeste
  detecterFormatManifeste(manifeste) {
    if (!manifeste || typeof manifeste !== 'object') {
        console.warn('🔍 [PAYS A] Manifeste invalide pour détection format');
        return 'UNKNOWN';
    }
    
    console.log('🔍 [PAYS A] Détection format - Clés disponibles:', Object.keys(manifeste));
    
    // Vérifier si c'est le format UEMOA (priorité aux articles)
    const hasArticles = manifeste.hasOwnProperty('articles') && Array.isArray(manifeste.articles);
    const hasNumeroManif = manifeste.hasOwnProperty('numero_manif');
    const hasConsignataire = manifeste.hasOwnProperty('consignataire');
    
    console.log('🔍 [PAYS A] Détection UEMOA:', { hasArticles, hasNumeroManif, hasConsignataire });
    
    if (hasArticles && (hasNumeroManif || hasConsignataire)) {
        console.log('✅ [PAYS A] Format UEMOA détecté');
        return 'UEMOA';
    }
    
    // Vérifier si c'est le format legacy
    const hasMarchandises = manifeste.hasOwnProperty('marchandises') && Array.isArray(manifeste.marchandises);
    const hasNumeroManifeste = manifeste.hasOwnProperty('numeroManifeste');
    const hasTransporteur = manifeste.hasOwnProperty('transporteur');
    
    console.log('🔍 [PAYS A] Détection Legacy:', { hasMarchandises, hasNumeroManifeste, hasTransporteur });
    
    if (hasMarchandises && (hasNumeroManifeste || hasTransporteur)) {
        console.log('✅ [PAYS A] Format Legacy détecté');
        return 'LEGACY';
    }
    
    console.warn('⚠️ [PAYS A] Format inconnu détecté');
    return 'UNKNOWN';
}

  // ✅ CORRECTION CRITIQUE: Préparation du payload FORMAT UEMOA selon les attentes du Kit MuleSoft
  preparerPayloadKitUEMOA(manifeste) {
    console.log(`🔧 [PAYS A] Préparation payload pour Kit MuleSoft...`);
    console.log(`📋 [PAYS A] Manifeste d'entrée:`, JSON.stringify(manifeste, null, 2));
    
    // ✅ CORRECTION URGENTE : Détecter le format du manifeste reçu
    const formatManifeste = this.detecterFormatManifeste(manifeste);
    console.log(`🔍 [PAYS A] Format manifeste détecté: ${formatManifeste}`);
    
    if (formatManifeste === 'UEMOA') {
        // ✅ MANIFESTE DÉJÀ EN FORMAT UEMOA - TRANSMISSION DIRECTE
        console.log(`✅ [PAYS A] Manifeste déjà en format UEMOA - Transmission directe`);
        
        // ✅ VALIDATION SPÉCIFIQUE POUR FORMAT UEMOA
        if (!manifeste.articles || !Array.isArray(manifeste.articles) || manifeste.articles.length === 0) {
            console.error('❌ [PAYS A] Articles UEMOA manquants:', {
                articles: manifeste.articles,
                type: typeof manifeste.articles,
                length: manifeste.articles?.length
            });
            throw new Error('Articles UEMOA manquants pour transmission Kit MuleSoft');
        }
        
        // Nettoyage et validation du format UEMOA
        const manifesteUEMOA = {
            annee_manif: String(manifeste.annee_manif || new Date().getFullYear()),
            bureau_manif: String(manifeste.bureau_manif || '18N'),
            numero_manif: parseInt(manifeste.numero_manif) || Date.now(),
            code_cgt: String(manifeste.code_cgt || '014'),
            consignataire: String(manifeste.consignataire || ''),
            repertoire: String(manifeste.repertoire || '02402'),
            
            navire: String(manifeste.navire || 'MARCO POLO'),
            provenance: String(manifeste.provenance || 'ROTTERDAM'),
            pavillon: String(manifeste.pavillon || 'LIBÉRIA'),
            date_arrivee: manifeste.date_arrivee || new Date().toISOString().split('T')[0],
            valapprox: parseFloat(manifeste.valapprox) || 0,
            
            nbre_article: parseInt(manifeste.nbre_article) || manifeste.articles.length,
            
            // ✅ TRAITEMENT DIRECT DES ARTICLES UEMOA
            articles: manifeste.articles.map((article, index) => {
                console.log(`🔧 [PAYS A] Traitement article UEMOA ${index + 1}:`, article);
                
                return {
                    art: parseInt(article.art) || (index + 1),
                    prec1: parseInt(article.prec1) || 0,
                    prec2: parseInt(article.prec2) || 0,
                    date_emb: article.date_emb || manifeste.date_arrivee,
                    lieu_emb: String(article.lieu_emb || manifeste.provenance || 'Rotterdam'),
                    pays_dest: String(article.pays_dest || ''),
                    ville_dest: String(article.ville_dest || this.getVilleDestination(article.pays_dest)),
                    connaissement: String(article.connaissement || `${Date.now()}${index}`.slice(-9)),
                    expediteur: String(article.expediteur || 'EXPORT COMPANY LTD'),
                    destinataire: String(article.destinataire || 'IMPORT SARL'),
                    voie_dest: String(article.voie_dest || 'Route terrestre'),
                    ordre: String(article.ordre || 'BANQUE ATLANTIQUE'),
                    marchandise: String(article.marchandise || `Marchandise ${index + 1}`),
                    poids: parseFloat(article.poids) || 1500,
                    nbre_colis: parseInt(article.nbre_colis) || 1,
                    marque: String(article.marque || 'NM'),
                    mode_cond: String(article.mode_cond || 'COLIS (PACKAGE)'),
                    nbre_conteneur: parseInt(article.nbre_conteneur) || 1,
                    
                    // ✅ TRAITEMENT DES CONTENEURS UEMOA
                    conteneurs: Array.isArray(article.conteneurs) && article.conteneurs.length > 0 
                        ? article.conteneurs.map(cont => ({
                            conteneur: String(cont.conteneur || `TCLU${Date.now().toString().slice(-7)}`),
                            type: String(cont.type || 'DRS'),
                            taille: String(cont.taille || '40'),
                            plomb: String(cont.plomb || `AE${Date.now().toString().slice(-7)}`)
                        }))
                        : [{
                            conteneur: `TCLU${Date.now().toString().slice(-7)}`,
                            type: "DRS",
                            taille: "40",
                            plomb: `AE${Date.now().toString().slice(-7)}`
                        }]
                };
            })
        };
        
        console.log(`✅ [PAYS A] Payload UEMOA finalisé (transmission directe):`);
        console.log(`   📋 Numéro: ${manifesteUEMOA.numero_manif} (${manifesteUEMOA.annee_manif})`);
        console.log(`   🏢 Consignataire: ${manifesteUEMOA.consignataire}`);
        console.log(`   🚢 Navire: ${manifesteUEMOA.navire}`);
        console.log(`   📦 Articles: ${manifesteUEMOA.nbre_article}`);
        console.log(`   🎯 Destinations: ${manifesteUEMOA.articles.map(a => a.pays_dest).join(', ')}`);
        console.log(`   📏 Taille payload: ${JSON.stringify(manifesteUEMOA).length} chars`);
        
        return manifesteUEMOA;
        
    } else {
        // ✅ FORMAT LEGACY - CONVERSION VERS UEMOA
        console.log(`🔄 [PAYS A] Conversion format legacy vers UEMOA...`);
        
        const numeroManifeste = manifeste.numeroManifeste || manifeste.id || 'MAN' + Date.now();
        console.log(`🔍 [PAYS A] Numéro manifeste legacy détecté: "${numeroManifeste}"`);
        
        // ✅ VALIDATION SPÉCIFIQUE POUR FORMAT LEGACY
        if (!manifeste.marchandises || !Array.isArray(manifeste.marchandises) || manifeste.marchandises.length === 0) {
            console.error('❌ [PAYS A] Marchandises legacy manquantes:', {
                marchandises: manifeste.marchandises,
                type: typeof manifeste.marchandises,
                length: manifeste.marchandises?.length
            });
            throw new Error('Marchandises legacy manquantes pour transformation UEMOA');
        }
        
        const anneeManif = numeroManifeste.match(/(\d{4})/) ? 
                           numeroManifeste.match(/(\d{4})/)[1] : 
                           new Date().getFullYear().toString();
        
        const numeroManifNumeric = numeroManifeste.replace(/\D/g, '') || Date.now().toString().slice(-6);
        
        const manifesteUEMOA = {
            annee_manif: anneeManif,
            bureau_manif: "18N",
            numero_manif: parseInt(numeroManifNumeric),
            code_cgt: "014",
            consignataire: manifeste.transporteur || "MAERSK LINE",
            repertoire: "02402",
            
            navire: manifeste.navire || "MARCO POLO",
            provenance: manifeste.portEmbarquement || "ROTTERDAM", 
            pavillon: "LIBÉRIA",
            date_arrivee: manifeste.dateArrivee || new Date().toISOString().split('T')[0],
            valapprox: 150000,
            
            nbre_article: manifeste.marchandises.length,
            
            // ✅ CONVERSION MARCHANDISES LEGACY -> ARTICLES UEMOA
            articles: manifeste.marchandises.map((marchandise, index) => {
                console.log(`🔧 [PAYS A] Conversion marchandise legacy ${index + 1}:`, marchandise);
                
                return {
                    art: index + 1,
                    prec1: 0,
                    prec2: 0,
                    date_emb: manifeste.dateArrivee || new Date().toISOString().split('T')[0],
                    lieu_emb: manifeste.portEmbarquement || "Rotterdam",
                    pays_dest: this.mapPaysDestination(marchandise.paysDestination),
                    ville_dest: this.getVilleDestination(marchandise.paysDestination),
                    connaissement: `${Date.now()}${index}`.slice(-9),
                    expediteur: "EXPORT COMPANY LTD",
                    destinataire: marchandise.destinataire || "IMPORT SARL",
                    voie_dest: "Route terrestre",
                    ordre: "BANQUE ATLANTIQUE",
                    marchandise: marchandise.designation || `Marchandise ${index + 1}`,
                    poids: marchandise.poidsBrut || 1500,
                    nbre_colis: marchandise.nombreColis || 1,
                    marque: "TOYOTA",
                    mode_cond: "COLIS (PACKAGE)",
                    nbre_conteneur: 1,
                    
                    conteneurs: [{
                        conteneur: `TCLU${Date.now().toString().slice(-7)}`,
                        type: "DRS",
                        taille: "40",
                        plomb: `AE${Date.now().toString().slice(-7)}`
                    }]
                };
            })
        };
        
        console.log(`✅ [PAYS A] Payload UEMOA préparé (conversion legacy):`);
        console.log(`   📋 Numéro: ${manifesteUEMOA.numero_manif} (${manifesteUEMOA.annee_manif})`);
        console.log(`   🏢 Consignataire: ${manifesteUEMOA.consignataire}`);
        console.log(`   🚢 Navire: ${manifesteUEMOA.navire}`);
        console.log(`   📦 Articles: ${manifesteUEMOA.nbre_article}`);
        console.log(`   🎯 Destinations: ${manifesteUEMOA.articles.map(a => a.pays_dest).join(', ')}`);
        console.log(`   📏 Taille payload: ${JSON.stringify(manifesteUEMOA).length} chars`);
        
        return manifesteUEMOA;
    }
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

  async notifierApurement(apurementData) {
    try {
      console.log(`🔓 [${this.paysCode}] Notification apurement vers Kit: ${apurementData.numeroManifeste}`);
      
      // Préparer les données pour le Kit
      const notificationApurement = {
        numeroManifeste: apurementData.numeroManifeste,
        referencePaiement: apurementData.referencePaiement,
        typeApurement: apurementData.typeApurement || 'LEVEE_MARCHANDISE',
        dateApurement: apurementData.dateApurement instanceof Date ? 
                       apurementData.dateApurement.toISOString() : apurementData.dateApurement,
        paysApurement: apurementData.paysApurement || this.paysCode,
        agentConfirmation: apurementData.agentConfirmation,
        typeConfirmation: apurementData.typeConfirmation,
        observations: apurementData.observations || ''
      };
      
      // ✅ Envoi vers MuleSoft - endpoint apurement
      const response = await this.client.post('/apurement/notification', notificationApurement);
      
      console.log(`✅ [${this.paysCode}] Apurement notifié avec succès:`, response.data);
      
      return {
        ...response.data,
        latence: response.metadata.duration,
        timestamp: response.metadata.timestamp,
        correlationId: response.metadata.correlationId,
        source: 'MULESOFT_DIRECT',
        success: true
      };
      
    } catch (error) {
      console.error(`❌ [${this.paysCode}] Échec notification apurement:`, error.message);
      
      throw new Error(`Notification apurement échouée: ${error.response?.data?.message || error.message}`);
    }
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