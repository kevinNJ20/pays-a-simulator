console.log('🇸🇳 ✅ Script Système Douanier Sénégal - Port de Dakar initialisé - Workflow libre pratique UEMOA');// ============================================================================
// SÉNÉGAL - Script Frontend CORRIGÉ - Port de Dakar
// Fichier: public/script.js - Système Douanier Pays de Prime Abord
// ============================================================================

// Configuration API - SÉNÉGAL
const API_BASE = window.location.origin + '/api';
const KIT_MULESOFT_URL = 'http://localhost:8080/api/v1';
window.SYSTEME_TYPE = 'PAYS_PRIME_ABORD';
window.PAYS_CODE = 'SEN';

let statusInterval;
let refreshInterval;
let kitConnected = false;
let articleCount = 1;

// ✅ FONCTION HELPER pour valeurs de champs
function getFieldValue(id, defaultValue = '') {
    try {
        const element = document.getElementById(id);
        if (element && element.value !== undefined) {
            const value = element.value.toString().trim();
            return value || defaultValue;
        }
        return defaultValue;
    } catch (error) {
        console.warn(`[SÉNÉGAL] Erreur getFieldValue ${id}:`, error);
        return defaultValue;
    }
}

// ✅ FONCTION HELPER pour accès sécurisé aux propriétés
function getValue(obj, path, fallback = null) {
    if (!obj || !path) return fallback;
    
    try {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length; i++) {
            if (current && typeof current === 'object' && keys[i] in current) {
                current = current[keys[i]];
            } else {
                return fallback;
            }
        }
        
        return current !== null && current !== undefined ? current : fallback;
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur getValue:', path, error);
        return fallback;
    }
}

// ✅ FONCTION HELPER pour mettre à jour des éléments DOM de manière sécurisée
function setElementText(id, value, fallback = '--') {
    try {
        const element = document.getElementById(id);
        if (element) {
            const displayValue = (value !== null && value !== undefined) ? value : fallback;
            element.textContent = displayValue;
            element.style.color = ''; // Reset color
            return true;
        }
        return false;
    } catch (error) {
        console.warn(`[SÉNÉGAL] Erreur setElementText ${id}:`, error);
        return false;
    }
}

// ✅ GESTION DYNAMIQUE DES ARTICLES
function ajouterArticle() {
    articleCount++;
    const container = document.getElementById('articles-container');
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-section';
    articleDiv.setAttribute('data-article', articleCount - 1);
    
    articleDiv.innerHTML = `
        <h4>Article ${articleCount} <button type="button" onclick="supprimerArticle(${articleCount - 1})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; margin-left: 10px;">❌</button></h4>
        <div class="form-row triple">
            <input type="number" name="art" placeholder="N° Article" value="${articleCount}" required>
            <input type="number" name="prec1" placeholder="Précision 1" value="0">
            <input type="number" name="prec2" placeholder="Précision 2" value="0">
        </div>
        <div class="form-row">
            <input type="date" name="date_emb" placeholder="Date embarquement" required>
            <input type="text" name="lieu_emb" placeholder="Lieu embarquement" required>
        </div>
        <div class="form-row">
            <select name="pays_dest" required>
                <option value="">Pays destination</option>
                <option value="MALI">🇲🇱 MALI</option>
                <option value="BURKINA FASO">🇧🇫 BURKINA FASO</option>
                <option value="NIGER">🇳🇪 NIGER</option>
                <option value="CÔTE D'IVOIRE">🇨🇮 CÔTE D'IVOIRE</option>
                <option value="GUINEA-BISSAU">🇬🇼 GUINEA-BISSAU</option>
                <option value="TOGO">🇹🇬 TOGO</option>
                <option value="BÉNIN">🇧🇯 BÉNIN</option>
            </select>
            <input type="text" name="ville_dest" placeholder="Ville destination" required>
        </div>
        <div class="form-row">
            <input type="text" name="connaissement" placeholder="Connaissement" required>
            <input type="text" name="expediteur" placeholder="Expéditeur" required>
        </div>
        <div class="form-row">
            <input type="text" name="destinataire" placeholder="Destinataire" required>
            <input type="text" name="voie_dest" placeholder="Voie destination">
        </div>
        <div class="form-row">
            <input type="text" name="ordre" placeholder="À l'ordre de">
            <input type="text" name="marchandise" placeholder="Description marchandise" required>
        </div>
        <div class="form-row triple">
            <input type="number" name="poids" placeholder="Poids (kg)" step="0.01" required>
            <input type="number" name="nbre_colis" placeholder="Nombre colis" required>
            <input type="text" name="marque" placeholder="Marque" value="NM">
        </div>
        <div class="form-row">
            <input type="text" name="mode_cond" placeholder="Mode conditionnement" value="COLIS (PACKAGE)">
            <input type="number" name="nbre_conteneur" placeholder="Nombre conteneurs" value="1" min="0">
        </div>
        <div class="conteneurs-container">
            <div class="conteneur-section" data-conteneur="0">
                <h5>Conteneur 1</h5>
                <div class="form-row">
                    <input type="text" name="conteneur" placeholder="N° Conteneur" required>
                    <select name="type" required>
                        <option value="">Type conteneur</option>
                        <option value="DRS">DRS - Dry Standard</option>
                        <option value="REF">REF - Refrigerated</option>
                        <option value="OPT">OPT - Open Top</option>
                        <option value="FLT">FLT - Flat Rack</option>
                    </select>
                </div>
                <div class="form-row">
                    <select name="taille" required>
                        <option value="">Taille conteneur</option>
                        <option value="20">20 pieds</option>
                        <option value="40">40 pieds</option>
                        <option value="45">45 pieds</option>
                    </select>
                    <input type="text" name="plomb" placeholder="N° Plomb" required>
                </div>
            </div>
        </div>
        <button type="button" class="btn btn-add" onclick="ajouterConteneur(${articleCount - 1})">➕ Ajouter Conteneur</button>
    `;
    
    container.appendChild(articleDiv);
}

function supprimerArticle(articleIndex) {
    const articleDiv = document.querySelector(`[data-article="${articleIndex}"]`);
    if (articleDiv && document.querySelectorAll('.article-section').length > 1) {
        articleDiv.remove();
    } else {
        afficherNotification('⚠️ Au moins un article est requis', 'warning');
    }
}

function ajouterConteneur(articleIndex) {
    const articleDiv = document.querySelector(`[data-article="${articleIndex}"]`);
}

// ✅ RESET FORM SÉNÉGAL
function resetForm() {
    try {
        const form = document.getElementById('manifeste-form');
        if (form) {
            form.reset();
            
            // Réinitialiser les dates par défaut
            const dateElement = document.getElementById('date_arrivee');
            if (dateElement) {
                dateElement.value = new Date().toISOString().split('T')[0];
            }
            
            const dateEmbElement = document.querySelector('input[name="date_emb"]');
            if (dateEmbElement) {
                dateEmbElement.value = new Date().toISOString().split('T')[0];
            }
            
            // Valeurs par défaut UEMOA Sénégal
            const defaultValues = {
                'annee_manif': '2025',
                'bureau_manif': '18N',
                'code_cgt': '014',
                'repertoire': '02402',
                'valapprox': '0'
            };
            
            Object.entries(defaultValues).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.value = value;
            });
            
            console.log('🇸🇳 [SÉNÉGAL] Formulaire UEMOA réinitialisé');
        }
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur reset form:', error);
    }
}

// ✅ CHARGEMENT STATISTIQUES SÉNÉGAL
async function chargerStatistiques() {
    try {
        console.log('📊 [SÉNÉGAL] Chargement statistiques Port de Dakar...');
        
        const response = await fetch(`${API_BASE}/statistiques`, {
            signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 [SÉNÉGAL] Réponse statistiques:', getValue(data, 'status', 'UNKNOWN'));
        
        const dataStatus = getValue(data, 'status', 'ERROR');
        const stats = getValue(data, 'statistiques', {});
        
        if (stats && ['SUCCESS', 'PARTIAL', 'DEGRADED'].includes(dataStatus)) {
            setElementText('stat-manifestes', getValue(stats, 'manifestesCreees', 0));
            setElementText('stat-transmissions', getValue(stats, 'transmissionsKit', 0));
            setElementText('stat-succes', getValue(stats, 'transmissionsReussies', 0));
            
            const tauxReussite = getValue(stats, 'performance.tauxReussiteGlobal', 100) || 
                               getValue(stats, 'tauxReussiteTransmission', 100) || 100;
            setElementText('taux-reussite', tauxReussite + '%');
            
            const latenceMoyenne = getValue(stats, 'performance.latenceMoyenne', 0) ||
                                  getValue(stats, 'latenceMoyenne', 0) || 0;
            setElementText('latence-moyenne', latenceMoyenne > 0 ? latenceMoyenne + ' ms' : '-- ms');
            
            console.log('✅ [SÉNÉGAL] Statistiques mises à jour');
            
            // Mise à jour statut Kit
            const kitData = getValue(data, 'kit', {});
            if (kitData) {
                kitConnected = getValue(kitData, 'accessible', false);
            }
            
        } else {
            console.warn('⚠️ [SÉNÉGAL] Statistiques non disponibles, statut:', dataStatus);
        }
        
    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur chargement statistiques:', error);
        
        // Marquer les éléments comme indisponibles
        const elements = ['stat-manifestes', 'stat-transmissions', 'stat-succes'];
        elements.forEach(id => {
            try {
                const element = document.getElementById(id);
                if (element && (element.textContent === '0' || element.textContent === '')) {
                    element.textContent = '--';
                    element.style.color = '#ffc107';
                }
            } catch (elemError) {
                console.warn(`[SÉNÉGAL] Erreur mise à jour ${id}:`, elemError);
            }
        });
    }
}

// ✅ CHARGEMENT MANIFESTES SÉNÉGAL
async function chargerManifestes() {
    try {
        const response = await fetch(`${API_BASE}/manifeste/lister?limite=5`, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const container = document.getElementById('manifestes-list');
        
        if (!container) return;
        
        const dataStatus = getValue(data, 'status', 'ERROR');
        const manifestes = getValue(data, 'manifestes', []);
        
        if (dataStatus === 'SUCCESS' && Array.isArray(manifestes) && manifestes.length > 0) {
            container.innerHTML = manifestes.map(manifeste => {
                const transmission = getValue(manifeste, 'transmission', {});
                const reussie = getValue(transmission, 'reussie', false);
                const statusBadge = reussie;
                const statutTransmission = getValue(transmission, 'statut', 'UNKNOWN');
                
                const transmissionClass = reussie ? 'transmitted' : 
                                         statutTransmission === 'ERREUR' ? 'error' : '';
                
                statusBadge = reussie ? 
                  '<span class="transmission-status success">✅ Transmis Kit</span>' :
                  statutTransmission === 'ERREUR' ? 
                  '<span class="transmission-status error">❌ Erreur Kit</span>' :
                statusBadge = reussie ? 
                  '<span class="transmission-status success">✅ Transmis Kit</span>' :
                  statutTransmission === 'ERREUR' ? 
                  '<span class="transmission-status error">❌ Erreur Kit</span>' :
                  '<span class="transmission-status pending">⏳ En attente</span>';
                
                const numeroManifeste = getValue(manifeste, 'numero_manif', null) || getValue(manifeste, 'numeroManifeste', 'N/A');
                const consignataire = getValue(manifeste, 'consignataire', null) || getValue(manifeste, 'transporteur', 'N/A');
                const navire = getValue(manifeste, 'navire', 'N/A');
                const nombreArticles = getValue(manifeste, 'nbre_article', 0) || getValue(manifeste, 'marchandises.nombre', 0);
                const dateCreation = getValue(manifeste, 'dateCreation', null);
                
                return `
                  <div class="manifeste-item ${transmissionClass}">
                    <div class="manifeste-header">N°${numeroManifeste} - ${consignataire}</div>
                    <div class="manifeste-details">
                      🚢 ${navire}<br>
                      📦 ${nombreArticles} article(s)<br>
                      📅 ${dateCreation ? new Date(dateCreation).toLocaleString('fr-FR') : 'N/A'}<br>
                      ${statusBadge}
                    </div>
                  </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p>Aucun manifeste trouvé au Port de Dakar</p>';
        }
        
    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur chargement manifestes:', error);
        const container = document.getElementById('manifestes-list');
        if (container) {
            container.innerHTML = '<p style="color: #ffc107;">⚠️ Erreur de chargement des manifestes</p>';
        }
    }
}

// ✅ TEST CONNEXION KIT MULESOFT avec retry robuste
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test Kit MuleSoft', 'Test de connectivité avancé...');
    afficherNotification('🔧 Test Kit en cours...', 'info');
    
    try {
        console.log('🔧 [SÉNÉGAL] Test Kit MuleSoft avec retry...');
        
        const tentatives = [
            { timeout: 15000, nom: 'Standard' },
            { timeout: 30000, nom: 'Étendu' },
            { timeout: 60000, nom: 'Maximum' }
        ];
        
        let dernièreErreur = null;
        
        for (let i = 0; i < tentatives.length; i++) {
            const tentative = tentatives[i];
            console.log(`🔧 [SÉNÉGAL] Tentative ${i + 1}/${tentatives.length} (timeout: ${tentative.timeout}ms)...`);
            
            try {
                const startTime = Date.now();
                
                const response = await fetch(`${API_BASE}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Source-Country': 'SEN',
                        'X-Source-System': 'SENEGAL_TEST_KIT',
                        'X-Test-Type': 'CONNECTIVITY'
                    },
                    signal: AbortSignal.timeout(tentative.timeout)
                });
                
                const duration = Date.now() - startTime;
                console.log(`🔧 [SÉNÉGAL] Réponse reçue en ${duration}ms (tentative ${i + 1})`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const kitInfo = getValue(data, 'kit', {});
                const accessible = getValue(kitInfo, 'accessible', false);
                const latence = getValue(kitInfo, 'latence', duration);
                const erreur = getValue(kitInfo, 'erreur', null);
                
                if (accessible) {
                    console.log(`✅ [SÉNÉGAL] Kit accessible (tentative ${i + 1}, latence: ${latence}ms)`);
                    afficherNotification(`✅ Kit MuleSoft accessible (${latence}ms) - Tentative ${i + 1}`, 'success');
                    ajouterInteraction('🔧 Test Kit', `✅ Succès tentative ${i + 1} - Latence: ${latence}ms`);
                    return true;
                } else {
                    throw new Error(erreur || 'Kit inaccessible selon le health check');
                }
                
            } catch (tentativeError) {
                dernièreErreur = tentativeError;
                console.warn(`⚠️ [SÉNÉGAL] Tentative ${i + 1} échouée:`, tentativeError.message);
                
                // Si ce n'est pas la dernière tentative, attendre avant de retry
                if (i < tentatives.length - 1) {
                    console.log(`⏳ [SÉNÉGAL] Attente 3s avant tentative ${i + 2}...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        
        // Toutes les tentatives ont échoué
        throw new Error(`Toutes les tentatives échouées. Dernière erreur: ${dernièreErreur?.message || 'Erreur inconnue'}`);
        
    } catch (error) {
        console.error('❌ [SÉNÉGAL] Test Kit échoué après toutes tentatives:', error);
        
        let errorMessage = error.message || 'Erreur inconnue';
        
        // Messages d'erreur plus informatifs
        if (errorMessage.includes('signal timed out')) {
            errorMessage = 'Timeout - Kit MuleSoft met trop de temps à répondre (peut-être en cold start sur CloudHub)';
        } else if (errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Impossible de joindre le Kit MuleSoft - Vérifiez la connectivité réseau';
        } else if (errorMessage.includes('NetworkError')) {
            errorMessage = 'Erreur réseau - Le Kit MuleSoft semble indisponible';
        }
        
        afficherNotification(`❌ Kit inaccessible: ${errorMessage}`, 'error');
        ajouterInteraction('🔧 Test Kit', `❌ Échec: ${errorMessage}`);
        return false;
    }
}

// ✅ DIAGNOSTIC COMPLET SÉNÉGAL
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Diagnostic complet Port de Dakar...');
    afficherNotification('🩺 Diagnostic en cours...', 'info');
    
    const resultats = {
        serviceSenegal: false,
        kitMulesoft: false,
        baseDonnees: false
    };
    
    try {
        // Test service local Sénégal
        try {
            console.log('🩺 [SÉNÉGAL] Test service local...');
            const healthResponse = await fetch(`${API_BASE}/health`, {
                signal: AbortSignal.timeout(10000)
            });
            resultats.serviceSenegal = healthResponse.ok;
            console.log(`🩺 [SÉNÉGAL] Service local: ${resultats.serviceSenegal ? 'OK' : 'KO'}`);
            
            // Test Kit MuleSoft
            if (healthResponse.ok) {
                console.log('🩺 [SÉNÉGAL] Test Kit MuleSoft via service local...');
                const healthData = await healthResponse.json();
                const kitInfo = getValue(healthData, 'kit', {});
                resultats.kitMulesoft = getValue(kitInfo, 'accessible', false);
                console.log(`🩺 [SÉNÉGAL] Kit MuleSoft: ${resultats.kitMulesoft ? 'OK' : 'KO'}`);
            }
        } catch (healthError) {
            console.warn('🩺 [SÉNÉGAL] Erreur test santé:', healthError);
        }
        
        // Test base de données via statistiques
        try {
            console.log('🩺 [SÉNÉGAL] Test base de données...');
            const statsResponse = await fetch(`${API_BASE}/statistiques`, {
                signal: AbortSignal.timeout(10000)
            });
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                resultats.baseDonnees = !!getValue(statsData, 'statistiques', null);
                console.log(`🩺 [SÉNÉGAL] Base de données: ${resultats.baseDonnees ? 'OK' : 'KO'}`);
            }
        } catch (statsError) {
            console.warn('🩺 [SÉNÉGAL] Erreur test base de données:', statsError);
        }
        
        const testsReussis = Object.values(resultats).filter(Boolean).length;
        const totalTests = Object.keys(resultats).length;
        
        const message = `Terminé - ${testsReussis}/${totalTests} composants opérationnels`;
        ajouterInteraction('🩺 Diagnostic', message);
        
        if (testsReussis >= 2) {
            afficherNotification(`✅ Système Sénégal fonctionnel - ${message}`, 'success');
        } else if (testsReussis >= 1) {
            afficherNotification(`⚠️ Système Sénégal dégradé - ${message}`, 'warning');
        } else {
            afficherNotification(`❌ Système Sénégal en panne - ${message}`, 'error');
        }
        
        console.log('🩺 [SÉNÉGAL] Diagnostic complet terminé:', resultats);
        
    } catch (error) {
        const errorMessage = error.message || 'Erreur inconnue';
        ajouterInteraction('🩺 Diagnostic', `❌ Erreur - ${errorMessage}`);
        afficherNotification('❌ Diagnostic échoué', 'error');
        console.error('🩺 [SÉNÉGAL] Erreur diagnostic:', error);
    }
}

// ✅ FONCTIONS APUREMENT - ÉTAPES 18-19
window.ouvrirApurement = async function(numeroManifeste, referencePaiement) {
    console.log('🔓 [SÉNÉGAL] Ouverture interface apurement ÉTAPES 18-19:', { numeroManifeste, referencePaiement });
    
    // Afficher la section apurement
    document.getElementById('apurement-section').style.display = 'block';
    document.getElementById('apurement-info').style.display = 'none';
    document.getElementById('apurement-loading').style.display = 'block';
    document.getElementById('apurement-error').style.display = 'none';
    document.getElementById('apurement-success').style.display = 'none';
    
    // Stocker les références
    window.apurementData = { numeroManifeste, referencePaiement };
    
    // Faire défiler jusqu'à la section
    document.getElementById('apurement-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // Charger les informations d'apurement
        const response = await fetch(`${API_BASE}/apurement/traiter?numeroManifeste=${numeroManifeste}&referencePaiement=${referencePaiement}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'SENEGAL_DOUANES_FRONTEND',
                'X-Source-Country': 'SEN'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📋 [SÉNÉGAL] Données apurement reçues:', result);
        
        if (result.status === 'SUCCESS' && result.data) {
            const data = result.data;
            
            // Vérifier si déjà apuré
            if (data.apurement) {
                throw new Error('Ce manifeste a déjà été apuré le ' + new Date(data.apurement.dateApurement).toLocaleString('fr-FR'));
            }
            
            // Vérifier si peut être apuré
            if (!data.peutEtreApure) {
                throw new Error('Ce manifeste ne peut pas être apuré. Statut actuel: ' + data.manifeste.statut);
            }
            
            // Remplir les informations
            document.getElementById('apu-numero-manifeste').textContent = data.manifeste.numero;
            document.getElementById('apu-navire').textContent = data.manifeste.navire;
            document.getElementById('apu-transporteur').textContent = data.manifeste.consignataire;
            document.getElementById('apu-montant').textContent = data.autorisation.montant.toLocaleString();
            document.getElementById('apu-pays').textContent = data.autorisation.paysDeclarant;
            document.getElementById('apu-date-mainlevee').textContent = new Date(data.autorisation.dateReception).toLocaleString('fr-FR');
            
            // Réinitialiser le formulaire
            document.getElementById('type-confirmation').value = 'DOUANE';
            document.getElementById('agent-confirmation').value = '';
            document.getElementById('observations').value = '';
            
            // Afficher le formulaire
            document.getElementById('apurement-loading').style.display = 'none';
            document.getElementById('apurement-info').style.display = 'block';
            
            ajouterInteraction('🔓 Apurement', `Interface apurement ouverte pour manifeste ${numeroManifeste}`);
            
        } else {
            throw new Error('Données apurement invalides');
        }
        
    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur chargement apurement:', error);
        document.getElementById('apurement-loading').style.display = 'none';
        document.getElementById('apurement-error').style.display = 'block';
        document.getElementById('apurement-error-message').textContent = error.message;
        ajouterInteraction('❌ Apurement', `Erreur: ${error.message}`);
    }
};

// Confirmer l'apurement - ÉTAPES 18-19
async function confirmerApurement() {
    const btnConfirmer = document.getElementById('btn-confirmer-apurement');
    const originalText = btnConfirmer.innerHTML;
    
    try {
        // Validation
        const agentConfirmation = document.getElementById('agent-confirmation').value.trim();
        if (!agentConfirmation) {
            throw new Error('Veuillez saisir le nom de l\'agent de confirmation');
        }
        
        // Désactiver le bouton
        btnConfirmer.disabled = true;
        btnConfirmer.innerHTML = '<div class="loading"></div> ÉTAPES 18-19 en cours...';
        
        // Préparer les données
        const apurementPayload = {
            numeroManifeste: window.apurementData.numeroManifeste,
            referencePaiement: window.apurementData.referencePaiement,
            typeConfirmation: document.getElementById('type-confirmation').value,
            agentConfirmation: agentConfirmation,
            observations: document.getElementById('observations').value.trim()
        };
        
        console.log('📤 [SÉNÉGAL] Envoi apurement ÉTAPES 18-19:', apurementPayload);
        
        // Appel API
        const response = await fetch(`${API_BASE}/apurement/traiter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'SENEGAL_DOUANES_FRONTEND',
                'X-Source-Country': 'SEN',
                'X-Payment-Reference': window.apurementData.referencePaiement
            },
            body: JSON.stringify(apurementPayload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ [SÉNÉGAL] ÉTAPES 18-19 terminées:', result);
        
        if (result.status === 'SUCCESS') {
            // Afficher le succès
            document.getElementById('apurement-info').style.display = 'none';
            document.getElementById('apurement-success').style.display = 'block';
            
            // Remplir les détails du succès
            document.getElementById('success-manifeste').textContent = result.apurement.numeroManifeste;
            document.getElementById('success-ref-apurement').textContent = result.bonEnlever.id;
            document.getElementById('success-type-confirmation').textContent = result.apurement.typeConfirmation;
            document.getElementById('success-agent').textContent = apurementPayload.agentConfirmation;
            document.getElementById('success-date').textContent = new Date(result.apurement.dateApurement).toLocaleString('fr-FR');
            
            afficherNotification('🇸🇳 ✅ Workflow Sénégal terminé - Étapes 18-19 complétées!', 'success');
            ajouterInteraction('✅ ÉTAPES 18-19', `Apurement et main levée attribués - Manifeste ${result.apurement.numeroManifeste} - Bon: ${result.bonEnlever.id}`);
            
            // Actualiser les données après 2 secondes
            setTimeout(() => {
                chargerManifestes();
                chargerStatistiques();
            }, 2000);
            
        } else {
            throw new Error(result.message || 'Erreur lors de l\'apurement');
        }
        
    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur confirmation apurement:', error);
        afficherNotification('❌ Erreur: ' + error.message, 'error');
        ajouterInteraction('❌ Apurement', `Erreur: ${error.message}`);
    } finally {
        btnConfirmer.disabled = false;
        btnConfirmer.innerHTML = originalText;
    }
}

// Fermer l'interface d'apurement
function fermerApurement() {
    document.getElementById('apurement-section').style.display = 'none';
    window.apurementData = null;
    
    // Si c'est une fenêtre popup, la fermer
    if (window.opener) {
        window.close();
    }
}

// ✅ FONCTIONS UTILITAIRES
async function chargerDonnees() {
    try {
        const promises = [
            chargerStatistiques().catch(err => console.warn('[SÉNÉGAL] Erreur stats:', err)),
            chargerManifestes().catch(err => console.warn('[SÉNÉGAL] Erreur manifestes:', err))
        ];
        
        await Promise.allSettled(promises);
    } catch (error) {
        console.error('[SÉNÉGAL] Erreur chargement données:', error);
    }
}

function ajouterInteraction(title, details) {
    try {
        const container = document.getElementById('kit-interactions');
        if (!container) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const safeTitle = (title || 'Action').toString().substring(0, 100);
        const safeDetails = (details || 'Détails non disponibles').toString().substring(0, 200);
        
        const item = document.createElement('div');
        item.className = 'interaction-item';
        
        if (safeDetails.includes('❌') || safeDetails.includes('Erreur') || safeDetails.includes('Échec')) {
            item.classList.add('error');
        } else if (safeDetails.includes('⚠️') || safeDetails.includes('Partiel')) {
            item.classList.add('warning');
        }
        
        item.innerHTML = `
          <div class="interaction-header">
            <div class="interaction-title">${safeTitle}</div>
            <div class="interaction-time">${timestamp}</div>
          </div>
          <div>${safeDetails}</div>
        `;
        
        container.prepend(item);
        
        // Garder seulement les 15 dernières interactions
        const items = container.querySelectorAll('.interaction-item');
        if (items.length > 15) {
            for (let i = 15; i < items.length; i++) {
                try {
                    items[i].remove();
                } catch (removeError) {
                    console.warn('[SÉNÉGAL] Erreur suppression interaction:', removeError);
                }
            }
        }
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur ajout interaction:', error);
    }
}

function afficherNotification(message, type) {
    try {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        const safeMessage = (message || 'Notification').toString().substring(0, 150);
        const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
        
        notification.textContent = safeMessage;
        notification.className = `notification ${safeType}`;
        notification.classList.add('show');
        
        const duration = safeType === 'error' ? 7000 : safeType === 'warning' ? 5000 : 3000;
        
        setTimeout(() => {
            try {
                notification.classList.remove('show');
            } catch (hideError) {
                console.warn('[SÉNÉGAL] Erreur masquage notification:', hideError);
            }
        }, duration);
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur affichage notification:', error);
    }
}

// ✅ VÉRIFICATION URL APUREMENT
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const numeroManifeste = urlParams.get('apurement_manifeste');
    const referencePaiement = urlParams.get('apurement_paiement');
    
    if (numeroManifeste && referencePaiement) {
        console.log('🔓 [SÉNÉGAL] Ouverture apurement depuis URL');
        // Attendre un peu que tout soit initialisé
        setTimeout(() => {
            window.ouvrirApurement(numeroManifeste, referencePaiement);
        }, 1000);
    }
});

// Cleanup ultra-sécurisé
window.addEventListener('beforeunload', () => {
    try {
        if (statusInterval) clearInterval(statusInterval);
        if (refreshInterval) clearInterval(refreshInterval);
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur cleanup:', error);
    }
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('[SÉNÉGAL] Erreur globale:', event.error);
    try {
        ajouterInteraction('⚠️ Erreur système', (event.error?.message || 'Erreur inconnue').substring(0, 100));
    } catch (interactionError) {
        console.warn('[SÉNÉGAL] Erreur ajout interaction erreur:', interactionError);
    }
});

// Gestion des promesses rejetées
window.addEventListener('unhandledrejection', (event) => {
    console.error('[SÉNÉGAL] Promesse rejetée:', event.reason);
    try {
        ajouterInteraction('⚠️ Promesse rejetée', (event.reason?.message || 'Promesse rejetée').substring(0, 100));
    } catch (interactionError) {
        console.warn('[SÉNÉGAL] Erreur ajout interaction promesse:', interactionError);
    }
});

// Fonctions publiques pour les boutons HTML
window.chargerStatistiques = chargerStatistiques;
window.chargerManifestes = chargerManifestes;
window.testerConnexionKit = testerConnexionKit;
window.lancerDiagnostic = lancerDiagnostic;
window.chargerDonnees = chargerDonnees;
window.ajouterArticle = ajouterArticle;
window.supprimerArticle = supprimerArticle;
window.ajouterConteneur = ajouterConteneur;
window.supprimerConteneur = supprimerConteneur;
window.confirmerApurement = confirmerApurement;
window.fermerApurement = fermerApurement;

