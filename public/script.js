// ============================================================================
// PAYS A - Script Frontend CORRIGÉ - Validation FORMAT UEMOA FIXÉE
// Fichier: public/script.js - VALIDATION CORRESPONDANT AU FORMULAIRE HTML
// ============================================================================

// Configuration API - PAYS A CORRIGÉ
const API_BASE = window.location.origin + '/api';
const KIT_MULESOFT_URL = 'http://localhost:8080/api/v1';
window.SYSTEME_TYPE = 'PAYS_A';
window.PAYS_CODE = 'CIV';

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
        console.warn(`Erreur getFieldValue ${id}:`, error);
        return defaultValue;
    }
}

// ✅ FONCTION HELPER pour accès sécurisé aux propriétés
function safeGet(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : defaultValue;
        }, obj);
    } catch (error) {
        console.warn('Accès sécurisé échoué:', path, error);
        return defaultValue;
    }
}

// ✅ FONCTION HELPER pour mettre à jour des éléments DOM de manière sécurisée
function updateElement(id, value, fallback = '--') {
    try {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value !== null && value !== undefined ? value : fallback;
            element.style.color = ''; // Reset color
            return true;
        }
        return false;
    } catch (error) {
        console.warn(`Erreur mise à jour élément ${id}:`, error);
        return false;
    }
}

// ✅ NOUVELLES FONCTIONS : Gestion dynamique articles et conteneurs
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
                <option value="SÉNÉGAL">🇸🇳 SÉNÉGAL</option>
                <option value="BURKINA FASO">🇧🇫 BURKINA FASO</option>
                <option value="MALI">🇲🇱 MALI</option>
                <option value="NIGER">🇳🇪 NIGER</option>
                <option value="TCHAD">🇹🇩 TCHAD</option>
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
    const conteneursContainer = articleDiv.querySelector('.conteneurs-container');
    const conteneurCount = conteneursContainer.children.length + 1;
    
    const conteneurDiv = document.createElement('div');
    conteneurDiv.className = 'conteneur-section';
    conteneurDiv.setAttribute('data-conteneur', conteneurCount - 1);
    
    conteneurDiv.innerHTML = `
        <h5>Conteneur ${conteneurCount} <button type="button" onclick="supprimerConteneur(${articleIndex}, ${conteneurCount - 1})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 2px 6px; margin-left: 10px; font-size: 10px;">❌</button></h5>
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
    `;
    
    conteneursContainer.appendChild(conteneurDiv);
}

function supprimerConteneur(articleIndex, conteneurIndex) {
    const articleDiv = document.querySelector(`[data-article="${articleIndex}"]`);
    const conteneurDiv = articleDiv.querySelector(`[data-conteneur="${conteneurIndex}"]`);
    const conteneursContainer = articleDiv.querySelector('.conteneurs-container');
    
    if (conteneurDiv && conteneursContainer.children.length > 1) {
        conteneurDiv.remove();
    } else {
        afficherNotification('⚠️ Au moins un conteneur est requis par article', 'warning');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Pays A - Version validation UEMOA corrigée');
    
    try {
        // Définir la date par défaut
        const dateElement = document.getElementById('date_arrivee');
        if (dateElement) {
            dateElement.value = new Date().toISOString().split('T')[0];
        }

        // Date embarquement par défaut pour le premier article
        const dateEmbElement = document.querySelector('input[name="date_emb"]');
        if (dateEmbElement) {
            dateEmbElement.value = new Date().toISOString().split('T')[0];
        }
        
        const initTimeElement = document.getElementById('init-time');
        if (initTimeElement) {
            initTimeElement.textContent = new Date().toLocaleTimeString();
        }
        
        // Vérifications périodiques
        verifierStatutKit();
        statusInterval = setInterval(verifierStatutKit, 30000);
        
        // Actualisation données
        chargerDonnees();
        refreshInterval = setInterval(chargerDonnees, 10000);
        
        // Gestionnaire de formulaire
        const form = document.getElementById('manifeste-form');
        if (form) {
            form.addEventListener('submit', creerManifeste);
        }
        
        ajouterInteraction('🏗️ Service démarré', 'Pays A opérationnel - Format UEMOA activé');
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        ajouterInteraction('⚠️ Initialisation', 'Erreur partielle: ' + (error.message || 'Erreur inconnue'));
    }
});

// ✅ CORRECTION PRINCIPALE : Vérification statut Kit avec timeout amélioré
async function verifierStatutKit() {
    try {
        console.log('🔍 [Pays A] Test statut Kit MuleSoft...');
        
        const response = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Country': 'CIV',
                'X-Source-System': 'PAYS_A_FRONTEND'
            },
            signal: AbortSignal.timeout(15000) // ✅ Augmenté à 15 secondes pour CloudHub
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // ✅ ACCÈS ULTRA-SÉCURISÉ aux propriétés du Kit
        const kitInfo = safeGet(data, 'kit', {});
        const accessible = safeGet(kitInfo, 'accessible', false);
        const status = safeGet(kitInfo, 'status', 'UNKNOWN');
        const latence = safeGet(kitInfo, 'latence', null);
        
        console.log('📊 [Pays A] Kit status reçu:', { accessible, status, latence });
        
        const banner = document.getElementById('kit-banner');
        const indicator = document.getElementById('kit-indicator');
        const statusText = document.getElementById('kit-status-text');
        const details = document.getElementById('kit-details');
        
        if (accessible) {
            // Kit connecté
            if (banner) {
                banner.className = 'kit-status-banner connected';
                banner.innerHTML = `✅ Kit d'Interconnexion opérationnel - ${status} ${latence ? `(${latence}ms)` : ''}`;
            }
            
            if (indicator) indicator.className = 'status-indicator connected';
            if (statusText) statusText.textContent = 'Kit Opérationnel';
            if (details) details.textContent = latence ? `Latence: ${latence}ms` : 'Connecté';
            
            kitConnected = true;
        } else {
            // Kit déconnecté
            if (banner) {
                banner.className = 'kit-status-banner disconnected';
                banner.innerHTML = `⚠️ Kit d'Interconnexion inaccessible - Service local opérationnel`;
            }
            
            if (indicator) indicator.className = 'status-indicator';
            if (statusText) statusText.textContent = 'Kit Inaccessible';
            if (details) details.textContent = 'Mode local uniquement';
            
            kitConnected = false;
        }
        
    } catch (error) {
        console.error('❌ [Pays A] Erreur vérification Kit:', error);
        const banner = document.getElementById('kit-banner');
        if (banner) {
            banner.className = 'kit-status-banner disconnected';
            banner.innerHTML = `⚠️ Impossible de vérifier le Kit - Service local actif`;
        }
        kitConnected = false;
    }
}

// ✅ CORRECTION MAJEURE : Création manifeste avec validation UEMOA correspondant au HTML
async function creerManifeste(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('btn-submit');
    if (!submitBtn) {
        console.error('Bouton submit introuvable');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    
    // Disable button et show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div> Transmission en cours...';
    
    try {
        console.log('📋 [Frontend] DÉBUT collecte données FORMAT UEMOA du formulaire...');
        
        // ✅ CORRECTION CRITIQUE : Collecte des champs UEMOA EXACTS du HTML
        const anneeManif = getFieldValue('annee_manif');
        const bureauManif = getFieldValue('bureau_manif');
        const numeroManif = getFieldValue('numero_manif');
        const codeCgt = getFieldValue('code_cgt');
        const consignataire = getFieldValue('consignataire');
        const repertoire = getFieldValue('repertoire');
        const navire = getFieldValue('navire');
        const provenance = getFieldValue('provenance');
        const pavillon = getFieldValue('pavillon');
        const dateArrivee = getFieldValue('date_arrivee');
        const valapprox = getFieldValue('valapprox', '0');
        
        console.log('🔍 [Frontend] Données UEMOA principales collectées:', {
            anneeManif: `"${anneeManif}"`,
            bureauManif: `"${bureauManif}"`,
            numeroManif: `"${numeroManif}"`,
            consignataire: `"${consignataire}"`,
            navire: `"${navire}"`,
            dateArrivee: `"${dateArrivee}"`
        });
        
        // ✅ Collecte des articles UEMOA depuis le DOM
        const articles = [];
        const articleSections = document.querySelectorAll('.article-section');
        
        console.log(`🔍 [Frontend] Nombre d'articles trouvés: ${articleSections.length}`);
        
        articleSections.forEach((section, index) => {
            console.log(`🔍 [Frontend] Traitement article ${index + 1}...`);
            
            const article = {
                art: parseInt(section.querySelector('input[name="art"]')?.value) || (index + 1),
                prec1: parseInt(section.querySelector('input[name="prec1"]')?.value) || 0,
                prec2: parseInt(section.querySelector('input[name="prec2"]')?.value) || 0,
                date_emb: section.querySelector('input[name="date_emb"]')?.value || dateArrivee,
                lieu_emb: section.querySelector('input[name="lieu_emb"]')?.value || provenance,
                pays_dest: section.querySelector('select[name="pays_dest"]')?.value || '',
                ville_dest: section.querySelector('input[name="ville_dest"]')?.value || '',
                connaissement: section.querySelector('input[name="connaissement"]')?.value || '',
                expediteur: section.querySelector('input[name="expediteur"]')?.value || '',
                destinataire: section.querySelector('input[name="destinataire"]')?.value || '',
                voie_dest: section.querySelector('input[name="voie_dest"]')?.value || '',
                ordre: section.querySelector('input[name="ordre"]')?.value || '',
                marchandise: section.querySelector('input[name="marchandise"]')?.value || '',
                poids: parseFloat(section.querySelector('input[name="poids"]')?.value) || 0,
                nbre_colis: parseInt(section.querySelector('input[name="nbre_colis"]')?.value) || 1,
                marque: section.querySelector('input[name="marque"]')?.value || 'NM',
                mode_cond: section.querySelector('input[name="mode_cond"]')?.value || 'COLIS (PACKAGE)',
                nbre_conteneur: parseInt(section.querySelector('input[name="nbre_conteneur"]')?.value) || 1,
                conteneurs: []
            };
            
            console.log(`🔍 [Frontend] Article ${index + 1} - pays_dest: "${article.pays_dest}", marchandise: "${article.marchandise}"`);
            
            // Collecte des conteneurs pour cet article
            const conteneurSections = section.querySelectorAll('.conteneur-section');
            conteneurSections.forEach(conteneurSection => {
                const conteneur = {
                    conteneur: conteneurSection.querySelector('input[name="conteneur"]')?.value || '',
                    type: conteneurSection.querySelector('select[name="type"]')?.value || 'DRS',
                    taille: conteneurSection.querySelector('select[name="taille"]')?.value || '40',
                    plomb: conteneurSection.querySelector('input[name="plomb"]')?.value || ''
                };
                article.conteneurs.push(conteneur);
            });
            
            articles.push(article);
        });
        
        // ✅ Construction du payload FORMAT UEMOA
        const manifesteUEMOA = {
            annee_manif: anneeManif,
            bureau_manif: bureauManif,
            numero_manif: parseInt(numeroManif) || Date.now(),
            code_cgt: codeCgt,
            consignataire: consignataire,
            repertoire: repertoire,
            navire: navire,
            provenance: provenance,
            pavillon: pavillon,
            date_arrivee: dateArrivee,
            valapprox: parseFloat(valapprox) || 0,
            nbre_article: articles.length,
            articles: articles
        };
        
        console.log('📦 [Frontend] Payload UEMOA final construit:', JSON.stringify(manifesteUEMOA, null, 2));
        
        // ✅ VALIDATION FORMAT UEMOA CORRIGÉE - Correspondant aux champs RÉELS du HTML
        const validationErrors = [];
        
        console.log('🔍 [Frontend] DÉBUT validation UEMOA...');
        
        // Validation champs principaux UEMOA
        if (!manifesteUEMOA.numero_manif || manifesteUEMOA.numero_manif === 0) {
            validationErrors.push('Numéro de manifeste UEMOA obligatoire (numero_manif)');
            console.error('❌ [Frontend] numero_manif manquant:', manifesteUEMOA.numero_manif);
        }
        
        if (!manifesteUEMOA.consignataire || manifesteUEMOA.consignataire.trim() === '') {
            validationErrors.push('Consignataire UEMOA obligatoire');
            console.error('❌ [Frontend] consignataire manquant:', manifesteUEMOA.consignataire);
        }
        
        if (!manifesteUEMOA.date_arrivee) {
            validationErrors.push('Date d\'arrivée UEMOA obligatoire');
            console.error('❌ [Frontend] date_arrivee manquante:', manifesteUEMOA.date_arrivee);
        }
        
        if (manifesteUEMOA.articles.length === 0) {
            validationErrors.push('Au moins un article UEMOA obligatoire');
            console.error('❌ [Frontend] Aucun article trouvé');
        } else {
            // Validation des articles
            manifesteUEMOA.articles.forEach((article, index) => {
                console.log(`🔍 [Frontend] Validation article ${index + 1}:`, article);
                
                if (!article.marchandise || article.marchandise.trim() === '') {
                    validationErrors.push(`Description de la marchandise obligatoire pour l'article ${index + 1}`);
                    console.error(`❌ [Frontend] Article ${index + 1} - marchandise manquante:`, article.marchandise);
                }
                
                if (!article.pays_dest || article.pays_dest.trim() === '') {
                    validationErrors.push(`Pays de destination obligatoire pour l'article ${index + 1}`);
                    console.error(`❌ [Frontend] Article ${index + 1} - pays_dest manquant:`, article.pays_dest);
                }
            });
        }
        
        if (validationErrors.length > 0) {
            console.error('❌ [Frontend] Validation UEMOA échouée:', validationErrors);
            throw new Error('Validation échouée: ' + validationErrors.join(', '));
        }
        
        console.log('✅ [Frontend] Validation UEMOA réussie, envoi vers backend...');
        ajouterInteraction('📋 Création manifeste UEMOA', 
            `N°${manifesteUEMOA.numero_manif} (${manifesteUEMOA.annee_manif}) - ${manifesteUEMOA.consignataire} vers ${manifesteUEMOA.articles.map(a => a.pays_dest).join(', ')}`);
        
        // ✅ APPEL API avec timeout amélioré
        const response = await fetch(API_BASE + '/manifeste/creer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Country': 'CIV',
                'X-Source-System': 'PAYS_A_FRONTEND',
                'Accept': 'application/json'
            },
            body: JSON.stringify(manifesteUEMOA),
            signal: AbortSignal.timeout(90000) // ✅ 90 secondes pour CloudHub
        });
        
        console.log(`🌐 [Frontend] Réponse HTTP: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.text();
                const errorJson = JSON.parse(errorText);
                errorMessage = safeGet(errorJson, 'message', errorMessage);
                console.error('❌ [Frontend] Erreur serveur:', errorJson);
            } catch (parseError) {
                console.warn('⚠️ [Frontend] Impossible de parser l\'erreur serveur');
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('📋 [Frontend] Résultat backend:', safeGet(result, 'status', 'UNKNOWN'));
        console.log('📋 [Frontend] Réponse complète:', JSON.stringify(result, null, 2));
        
        // ✅ TRAITEMENT ULTRA-SÉCURISÉ DU RÉSULTAT
        const resultStatus = safeGet(result, 'status', 'UNKNOWN');
        
        if (resultStatus === 'SUCCESS') {
            afficherNotification('✅ Manifeste UEMOA créé et transmis au Kit avec succès!', 'success');
            
            const latence = safeGet(result, 'transmissionKit.succes.latence', null) ||
                           safeGet(result, 'transmission.latence', null) ||
                           safeGet(result, 'transmissionKit.latence', null) ||
                           'N/A';
            
            const manifesteId = safeGet(result, 'manifeste.id', null) ||
                               safeGet(result, 'manifeste.numero_manif', null) ||
                               manifesteUEMOA.numero_manif ||
                               'ID inconnu';
            
            ajouterInteraction('🚀 Transmission Kit UEMOA', 
                `✅ Succès - N°${manifesteId} (${latence}ms)`);
            
            // Reset form
            resetForm();
            
        } else if (resultStatus === 'PARTIAL_SUCCESS') {
            afficherNotification('⚠️ Manifeste UEMOA créé localement mais erreur transmission Kit', 'warning');
            
            const erreur = safeGet(result, 'transmissionKit.echec.erreur', null) ||
                          safeGet(result, 'transmission.erreur', null) ||
                          safeGet(result, 'erreur', null) ||
                          'Erreur de transmission inconnue';
            
            ajouterInteraction('🚀 Transmission Kit UEMOA', `⚠️ Partiel - ${erreur}`);
        } else {
            const errorMessage = safeGet(result, 'message', 'Erreur inconnue du serveur');
            console.error('❌ [Frontend] Statut inattendu:', resultStatus, result);
            throw new Error(errorMessage);
        }
        
        // ✅ ACTUALISATION FORCÉE SÉCURISÉE
        console.log('🔄 [Frontend] Actualisation forcée des statistiques...');
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Promise.allSettled([
                chargerStatistiques().catch(err => console.warn('Erreur stats:', err)),
                chargerManifestes().catch(err => console.warn('Erreur manifestes:', err))
            ]);
            console.log('✅ [Frontend] Actualisation terminée');
        } catch (refreshError) {
            console.warn('Erreur actualisation:', refreshError);
        }
        
    } catch (error) {
        console.error('❌ [Frontend] Erreur création manifeste:', error);
        const errorMessage = error.message || 'Erreur inconnue';
        afficherNotification('❌ Erreur: ' + errorMessage, 'error');
        ajouterInteraction('📋 Création manifeste UEMOA', `❌ Erreur: ${errorMessage}`);
    } finally {
        // ✅ RESTORE BUTTON TOUJOURS
        try {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (restoreError) {
            console.warn('Erreur restauration bouton:', restoreError);
        }
    }
}

// ✅ RESET FORM SÉCURISÉ
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
            
            // Réinitialiser les valeurs par défaut UEMOA
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
            
            console.log('✅ Formulaire UEMOA réinitialisé');
        }
    } catch (error) {
        console.warn('Erreur reset form:', error);
    }
}

// ✅ CORRECTION : Chargement statistiques ultra-sécurisé
async function chargerStatistiques() {
    try {
        console.log('📊 Chargement statistiques...');
        
        const response = await fetch(`${API_BASE}/statistiques`, {
            signal: AbortSignal.timeout(15000) // ✅ Timeout augmenté
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Réponse statistiques:', safeGet(data, 'status', 'UNKNOWN'));
        
        const dataStatus = safeGet(data, 'status', 'ERROR');
        const stats = safeGet(data, 'statistiques', {});
        
        if (stats && ['SUCCESS', 'PARTIAL', 'DEGRADED'].includes(dataStatus)) {
            updateElement('stat-manifestes', safeGet(stats, 'manifestesCreees', 0));
            updateElement('stat-transmissions', safeGet(stats, 'transmissionsKit', 0));
            updateElement('stat-succes', safeGet(stats, 'transmissionsReussies', 0));
            updateElement('taux-reussite', (safeGet(stats, 'tauxReussiteTransmission', 100)) + '%');
            
            const latenceMoyenne = safeGet(stats, 'performance.latenceMoyenne', 0) ||
                                  safeGet(stats, 'latenceMoyenne', 0) ||
                                  0;
            updateElement('latence-moyenne', latenceMoyenne > 0 ? latenceMoyenne + ' ms' : '-- ms');
            
            console.log('✅ Statistiques mises à jour');
            
            const kitData = safeGet(data, 'kit', {});
            if (kitData) {
                kitConnected = safeGet(kitData, 'accessible', false);
            }
            
        } else {
            console.warn('⚠️ Statistiques non disponibles, statut:', dataStatus);
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement statistiques:', error);
        
        const elements = ['stat-manifestes', 'stat-transmissions', 'stat-succes'];
        elements.forEach(id => {
            try {
                const element = document.getElementById(id);
                if (element && (element.textContent === '0' || element.textContent === '')) {
                    element.textContent = '--';
                    element.style.color = '#ffc107';
                }
            } catch (elemError) {
                console.warn(`Erreur mise à jour ${id}:`, elemError);
            }
        });
    }
}

// ✅ Chargement manifestes ultra-sécurisé
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
        
        const dataStatus = safeGet(data, 'status', 'ERROR');
        const manifestes = safeGet(data, 'manifestes', []);
        
        if (dataStatus === 'SUCCESS' && Array.isArray(manifestes) && manifestes.length > 0) {
            container.innerHTML = manifestes.map(manifeste => {
                const transmission = safeGet(manifeste, 'transmission', {});
                const reussie = safeGet(transmission, 'reussie', false);
                const statutTransmission = safeGet(transmission, 'statut', 'UNKNOWN');
                
                const transmissionClass = reussie ? 'transmitted' : 
                                         statutTransmission === 'ERREUR' ? 'error' : '';
                
                const statusBadge = reussie ? 
                  '<span class="transmission-status success">✅ Transmis Kit</span>' :
                  statutTransmission === 'ERREUR' ? 
                  '<span class="transmission-status error">❌ Erreur Kit</span>' :
                  '<span class="transmission-status pending">⏳ En attente</span>';
                
                const numeroManifeste = safeGet(manifeste, 'numero_manif', null) || safeGet(manifeste, 'numeroManifeste', 'N/A');
                const transporteur = safeGet(manifeste, 'consignataire', null) || safeGet(manifeste, 'transporteur', 'N/A');
                const navire = safeGet(manifeste, 'navire', 'N/A');
                const nombreArticles = safeGet(manifeste, 'nbre_article', 0) || safeGet(manifeste, 'marchandises.nombre', 0);
                const dateCreation = safeGet(manifeste, 'dateCreation', null);
                
                return `
                  <div class="manifeste-item ${transmissionClass}">
                    <div class="manifeste-header">N°${numeroManifeste} - ${transporteur}</div>
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
            container.innerHTML = '<p>Aucun manifeste trouvé</p>';
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement manifestes:', error);
        const container = document.getElementById('manifestes-list');
        if (container) {
            container.innerHTML = '<p style="color: #ffc107;">⚠️ Erreur de chargement des manifestes</p>';
        }
    }
}

// ✅ CORRECTION MAJEURE : Test de connexion Kit avec timeout robuste
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test connexion Kit', 'Test de connectivité avancé...');
    afficherNotification('🔧 Test Kit en cours...', 'info');
    
    try {
        console.log('🔧 [Pays A] Début test connectivité Kit MuleSoft avec retry...');
        
        // ✅ AMÉLIORATION: Tentatives multiples avec timeouts progressifs
        const tentatives = [
            { timeout: 15000, nom: 'Standard' },
            { timeout: 30000, nom: 'Étendu' },
            { timeout: 60000, nom: 'Maximum' }
        ];
        
        let dernièreErreur = null;
        
        for (let i = 0; i < tentatives.length; i++) {
            const tentative = tentatives[i];
            console.log(`🔧 [Pays A] Tentative ${i + 1}/${tentatives.length} (timeout: ${tentative.timeout}ms)...`);
            
            try {
                const startTime = Date.now();
                
                const response = await fetch(`${API_BASE}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Source-Country': 'CIV',
                        'X-Source-System': 'PAYS_A_TEST_KIT',
                        'X-Test-Type': 'CONNECTIVITY'
                    },
                    signal: AbortSignal.timeout(tentative.timeout)
                });
                
                const duration = Date.now() - startTime;
                console.log(`🔧 [Pays A] Réponse reçue en ${duration}ms (tentative ${i + 1})`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const kitInfo = safeGet(data, 'kit', {});
                const accessible = safeGet(kitInfo, 'accessible', false);
                const latence = safeGet(kitInfo, 'latence', duration);
                const erreur = safeGet(kitInfo, 'erreur', null);
                
                if (accessible) {
                    console.log(`✅ [Pays A] Kit accessible (tentative ${i + 1}, latence: ${latence}ms)`);
                    afficherNotification(`✅ Kit accessible (${latence}ms) - Tentative ${i + 1}`, 'success');
                    ajouterInteraction('🔧 Test Kit', `✅ Succès tentative ${i + 1} - Latence: ${latence}ms`);
                    return true;
                } else {
                    throw new Error(erreur || 'Kit inaccessible selon le health check');
                }
                
            } catch (tentativeError) {
                dernièreErreur = tentativeError;
                console.warn(`⚠️ [Pays A] Tentative ${i + 1} échouée:`, tentativeError.message);
                
                // Si ce n'est pas la dernière tentative, attendre avant de retry
                if (i < tentatives.length - 1) {
                    console.log(`⏳ [Pays A] Attente 3s avant tentative ${i + 2}...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        
        // Toutes les tentatives ont échoué
        throw new Error(`Toutes les tentatives échouées. Dernière erreur: ${dernièreErreur?.message || 'Erreur inconnue'}`);
        
    } catch (error) {
        console.error('❌ [Pays A] Test Kit échoué après toutes tentatives:', error);
        
        let errorMessage = error.message || 'Erreur inconnue';
        
        // ✅ Messages d'erreur plus informatifs
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

// Diagnostic complet ultra-sécurisé
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Démarrage diagnostic complet...');
    afficherNotification('🩺 Diagnostic en cours...', 'info');
    
    const resultats = {
        serviceLocal: false,
        kitMulesoft: false,
        baseDonnees: false
    };
    
    try {
        // Test service local
        try {
            console.log('🩺 [Pays A] Test service local...');
            const healthResponse = await fetch(`${API_BASE}/health`, {
                signal: AbortSignal.timeout(10000)
            });
            resultats.serviceLocal = healthResponse.ok;
            console.log(`🩺 [Pays A] Service local: ${resultats.serviceLocal ? 'OK' : 'KO'}`);
            
            // Test Kit MuleSoft
            if (healthResponse.ok) {
                console.log('🩺 [Pays A] Test Kit MuleSoft via service local...');
                const healthData = await healthResponse.json();
                const kitInfo = safeGet(healthData, 'kit', {});
                resultats.kitMulesoft = safeGet(kitInfo, 'accessible', false);
                console.log(`🩺 [Pays A] Kit MuleSoft: ${resultats.kitMulesoft ? 'OK' : 'KO'}`);
            }
        } catch (healthError) {
            console.warn('🩺 [Pays A] Erreur test santé:', healthError);
        }
        
        // Test base de données via statistiques
        try {
            console.log('🩺 [Pays A] Test base de données...');
            const statsResponse = await fetch(`${API_BASE}/statistiques`, {
                signal: AbortSignal.timeout(10000)
            });
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                resultats.baseDonnees = !!safeGet(statsData, 'statistiques', null);
                console.log(`🩺 [Pays A] Base de données: ${resultats.baseDonnees ? 'OK' : 'KO'}`);
            }
        } catch (statsError) {
            console.warn('🩺 [Pays A] Erreur test base de données:', statsError);
        }
        
        const testsReussis = Object.values(resultats).filter(Boolean).length;
        const totalTests = Object.keys(resultats).length;
        
        const message = `Terminé - ${testsReussis}/${totalTests} composants opérationnels`;
        ajouterInteraction('🩺 Diagnostic', message);
        
        if (testsReussis >= 2) {
            afficherNotification(`✅ Système fonctionnel - ${message}`, 'success');
        } else if (testsReussis >= 1) {
            afficherNotification(`⚠️ Système dégradé - ${message}`, 'warning');
        } else {
            afficherNotification(`❌ Système en panne - ${message}`, 'error');
        }
        
        console.log('🩺 [Pays A] Diagnostic complet terminé:', resultats);
        
    } catch (error) {
        const errorMessage = error.message || 'Erreur inconnue';
        ajouterInteraction('🩺 Diagnostic', `❌ Erreur - ${errorMessage}`);
        afficherNotification('❌ Diagnostic échoué', 'error');
        console.error('🩺 [Pays A] Erreur diagnostic:', error);
    }
}

// Charger toutes les données avec gestion d'erreur
async function chargerDonnees() {
    try {
        const promises = [
            chargerStatistiques().catch(err => console.warn('Erreur stats:', err)),
            chargerManifestes().catch(err => console.warn('Erreur manifestes:', err))
        ];
        
        await Promise.allSettled(promises);
    } catch (error) {
        console.error('Erreur chargement données:', error);
    }
}

// ✅ Ajouter interaction ultra-sécurisé
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
                    console.warn('Erreur suppression interaction:', removeError);
                }
            }
        }
    } catch (error) {
        console.warn('Erreur ajout interaction:', error);
    }
}

// Notification ultra-sécurisée
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
                console.warn('Erreur masquage notification:', hideError);
            }
        }, duration);
    } catch (error) {
        console.warn('Erreur affichage notification:', error);
    }
}

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

// Cleanup ultra-sécurisé
window.addEventListener('beforeunload', () => {
    try {
        if (statusInterval) clearInterval(statusInterval);
        if (refreshInterval) clearInterval(refreshInterval);
    } catch (error) {
        console.warn('Erreur cleanup:', error);
    }
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
    try {
        ajouterInteraction('⚠️ Erreur système', (event.error?.message || 'Erreur inconnue').substring(0, 100));
    } catch (interactionError) {
        console.warn('Erreur ajout interaction erreur:', interactionError);
    }
});

// Gestion des promesses rejetées
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    try {
        ajouterInteraction('⚠️ Promesse rejetée', (event.reason?.message || 'Promesse rejetée').substring(0, 100));
    } catch (interactionError) {
        console.warn('Erreur ajout interaction promesse:', interactionError);
    }
});

console.log('✅ Script Pays A ULTRA-SÉCURISÉ avec validation UEMOA CORRIGÉE initialisé');