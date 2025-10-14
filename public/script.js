// ============================================================================
// SÉNÉGAL - Script Frontend AMÉLIORÉ - Port de Dakar
// Interface Apurement Visible et Intuitive
// ============================================================================

const API_BASE = window.location.origin + '/api';
let statusInterval;
let refreshInterval;
let kitConnected = false;
let articleCount = 1;
let currentFilter = 'TOUS';
let tousLesManifestes = []; // ✅ NOUVEAU: Cache de tous les manifestes
let marchandiseTransitCount = 1;

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
        console.warn('Erreur getValue:', path, error);
        return fallback;
    }
}

// ✅ FONCTION HELPER pour mettre à jour des éléments DOM
function setElementText(id, value, fallback = '--') {
    try {
        const element = document.getElementById(id);
        if (element) {
            const displayValue = (value !== null && value !== undefined) ? value : fallback;
            element.textContent = displayValue;
            return true;
        }
        return false;
    } catch (error) {
        console.warn(`Erreur setElementText ${id}:`, error);
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
document.addEventListener('DOMContentLoaded', function () {
    console.log('🇸🇳 Initialisation Système Douanier Sénégal - Port de Dakar');

    try {
        const dateElement = document.getElementById('date_arrivee');
        if (dateElement) {
            dateElement.value = new Date().toISOString().split('T')[0];
        }

        const dateEmbElement = document.querySelector('input[name="date_emb"]');
        if (dateEmbElement) {
            dateEmbElement.value = new Date().toISOString().split('T')[0];
        }

        const initTimeElement = document.getElementById('init-time');
        if (initTimeElement) {
            initTimeElement.textContent = new Date().toLocaleTimeString();
        }

        verifierStatutKit();
        statusInterval = setInterval(verifierStatutKit, 30000);

        chargerDonnees();
        refreshInterval = setInterval(chargerDonnees, 10000); // ✅ NOUVEAU: Refresh plus fréquent

        const form = document.getElementById('manifeste-form');
        if (form) {
            form.addEventListener('submit', creerManifeste);
        }

        ajouterInteraction('🇸🇳 Port de Dakar démarré', 'Sénégal - Pays de prime abord - Format UEMOA activé');

    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur initialisation:', error);
        ajouterInteraction('⚠️ Initialisation', 'Erreur partielle: ' + (error.message || 'Erreur inconnue'));
    }
});

// ✅ CRÉATION DE MANIFESTE - ÉTAPES 1-5 du workflow Sénégal
async function creerManifeste(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('btn-submit');
    if (!submitBtn) {
        console.error('[SÉNÉGAL] Bouton submit introuvable');
        return;
    }

    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div> Étapes 1-5 en cours...';

    try {
        console.log('🇸🇳 [SÉNÉGAL] DÉBUT WORKFLOW - Création manifeste Port de Dakar');

        const manifesteUEMOA = {
            annee_manif: getFieldValue('annee_manif'),
            bureau_manif: getFieldValue('bureau_manif'),
            numero_manif: parseInt(getFieldValue('numero_manif')) || Date.now(),
            code_cgt: getFieldValue('code_cgt'),
            consignataire: getFieldValue('consignataire'),
            repertoire: getFieldValue('repertoire'),
            navire: getFieldValue('navire'),
            provenance: getFieldValue('provenance'),
            pavillon: getFieldValue('pavillon'),
            date_arrivee: getFieldValue('date_arrivee'),
            valapprox: parseFloat(getFieldValue('valapprox', '0')) || 0,
            nbre_article: 0,
            articles: []
        };

        const articleSections = document.querySelectorAll('.article-section');

        articleSections.forEach((section, index) => {
            const article = {
                art: parseInt(section.querySelector('input[name="art"]')?.value) || (index + 1),
                prec1: parseInt(section.querySelector('input[name="prec1"]')?.value) || 0,
                prec2: parseInt(section.querySelector('input[name="prec2"]')?.value) || 0,
                date_emb: section.querySelector('input[name="date_emb"]')?.value || manifesteUEMOA.date_arrivee,
                lieu_emb: section.querySelector('input[name="lieu_emb"]')?.value || manifesteUEMOA.provenance,
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

            manifesteUEMOA.articles.push(article);
        });

        manifesteUEMOA.nbre_article = manifesteUEMOA.articles.length;

        console.log('🇸🇳 [SÉNÉGAL] Manifeste UEMOA préparé:', manifesteUEMOA);

        const erreurs = [];
        if (!manifesteUEMOA.numero_manif) erreurs.push('Numéro manifeste requis');
        if (!manifesteUEMOA.consignataire) erreurs.push('Consignataire requis');
        if (!manifesteUEMOA.date_arrivee) erreurs.push('Date arrivée requise');
        if (manifesteUEMOA.articles.length === 0) erreurs.push('Au moins un article requis');

        if (erreurs.length > 0) {
            throw new Error('Validation échouée: ' + erreurs.join(', '));
        }

        ajouterInteraction('🇸🇳 ÉTAPES 1-3: Création manifeste',
            `N°${manifesteUEMOA.numero_manif} - ${manifesteUEMOA.consignataire} - ${manifesteUEMOA.articles.length} articles`);

        const response = await fetch(API_BASE + '/manifeste/creer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Country': 'SEN',
                'X-Source-System': 'SENEGAL_DOUANES_FRONTEND',
                'Accept': 'application/json'
            },
            body: JSON.stringify(manifesteUEMOA),
            signal: AbortSignal.timeout(90000)
        });

        console.log(`🇸🇳 [SÉNÉGAL] Réponse HTTP: ${response.status}`);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = getValue(errorData, 'message', errorMessage);
            } catch (parseError) {
                console.warn('[SÉNÉGAL] Impossible de parser erreur serveur');
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('🇸🇳 [SÉNÉGAL] Résultat:', getValue(result, 'status', 'UNKNOWN'));

        const resultStatus = getValue(result, 'status', 'UNKNOWN');

        if (resultStatus === 'SUCCESS') {
            afficherNotification('🇸🇳 ✅ Workflow Sénégal réussi - Étapes 1-5 terminées!', 'success');

            const manifesteId = getValue(result, 'manifeste.numero_manif', manifesteUEMOA.numero_manif);
            const kitReussi = getValue(result, 'transmissionKit.reussie', false);

            if (kitReussi) {
                ajouterInteraction('🚀 ÉTAPES 4-5: Transmission Kit',
                    `✅ Extraction transmise vers pays destination - Manifeste N°${manifesteId}`);
            } else {
                ajouterInteraction('⚠️ ÉTAPES 4-5: Kit d\'Interconnexion',
                    `Extraction non transmise - Mode local uniquement`);
            }

            resetForm();

        } else if (resultStatus === 'PARTIAL_SUCCESS') {
            afficherNotification('🇸🇳 ⚠️ Manifeste créé, erreur transmission Kit d\'Interconnexion', 'warning');

            const erreurKit = getValue(result, 'transmissionKit.echec.erreur', 'Erreur Kit inconnue');
            ajouterInteraction('⚠️ ÉTAPES 4-5: Transmission Kit', `Échec - ${erreurKit}`);

        } else {
            const errorMessage = getValue(result, 'message', 'Erreur serveur inconnue');
            throw new Error(errorMessage);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        await Promise.allSettled([
            chargerStatistiques().catch(err => console.warn('Erreur stats:', err)),
            chargerManifestes().catch(err => console.warn('Erreur manifestes:', err))
        ]);

    } catch (error) {
        console.error('🇸🇳 [SÉNÉGAL] Erreur workflow:', error);
        const errorMessage = error.message || 'Erreur inconnue';
        afficherNotification('🇸🇳 ❌ Erreur: ' + errorMessage, 'error');
        ajouterInteraction('❌ Workflow Sénégal', `Erreur: ${errorMessage}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// ✅ RESET FORM
function resetForm() {
    try {
        const form = document.getElementById('manifeste-form');
        if (form) {
            form.reset();

            document.getElementById('date_arrivee').value = new Date().toISOString().split('T')[0];
            document.querySelector('input[name="date_emb"]').value = new Date().toISOString().split('T')[0];

            document.getElementById('annee_manif').value = '2025';
            document.getElementById('bureau_manif').value = '18N';
            document.getElementById('code_cgt').value = '014';
            document.getElementById('repertoire').value = '02402';
            document.getElementById('valapprox').value = '0';

            console.log('🇸🇳 [SÉNÉGAL] Formulaire réinitialisé');
        }
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur reset form:', error);
    }
}

// ✅ VÉRIFICATION STATUT KIT D'INTERCONNEXION
async function verifierStatutKit() {
    try {
        console.log('🔍 [SÉNÉGAL] Test statut Kit d\'Interconnexion...');

        const response = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Country': 'SEN',
                'X-Source-System': 'SENEGAL_FRONTEND'
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const kitInfo = getValue(data, 'kit', {});
        const accessible = getValue(kitInfo, 'accessible', false);
        const status = getValue(kitInfo, 'status', 'UNKNOWN');
        const latence = getValue(kitInfo, 'latence', null);

        const banner = document.getElementById('kit-banner');
        const indicator = document.getElementById('kit-indicator');
        const statusText = document.getElementById('kit-status-text');
        const details = document.getElementById('kit-details');

        if (accessible) {
            if (banner) {
                banner.className = 'kit-status-banner connected';
                banner.innerHTML = `✅ Kit d'Interconnexion opérationnel - ${status} ${latence ? `(${latence}ms)` : ''}`;
            }

            if (indicator) indicator.className = 'status-indicator connected';
            if (statusText) statusText.textContent = 'Kit Opérationnel';
            if (details) details.textContent = latence ? `Latence: ${latence}ms` : 'Connecté';

            kitConnected = true;
        } else {
            if (banner) {
                banner.className = 'kit-status-banner disconnected';
                banner.innerHTML = `⚠️ Kit d'Interconnexion inaccessible - Service local Sénégal opérationnel`;
            }

            if (indicator) indicator.className = 'status-indicator';
            if (statusText) statusText.textContent = 'Kit Inaccessible';
            if (details) details.textContent = 'Mode local uniquement';

            kitConnected = false;
        }

    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur vérification Kit:', error);
        const banner = document.getElementById('kit-banner');
        if (banner) {
            banner.className = 'kit-status-banner disconnected';
            banner.innerHTML = `⚠️ Kit d'Interconnexion non vérifiable - Service Sénégal actif`;
        }
        kitConnected = false;
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
        console.log('📊 [SÉNÉGAL] Statistiques reçues:', getValue(data, 'status', 'UNKNOWN'));

        const dataStatus = getValue(data, 'status', 'ERROR');
        const stats = getValue(data, 'statistiques', {});

        if (stats && ['SUCCESS', 'PARTIAL', 'DEGRADED'].includes(dataStatus)) {
            setElementText('stat-manifestes', getValue(stats, 'manifestesCreees', 0));
            setElementText('stat-transmissions', getValue(stats, 'transmissionsKit', 0));
            setElementText('stat-succes', getValue(stats, 'transmissionsReussies', 0));

            const tauxReussite = getValue(stats, 'performance.tauxReussiteGlobal', 100) || 100;
            setElementText('taux-reussite', tauxReussite + '%');

            const latenceMoyenne = getValue(stats, 'performance.latenceMoyenne', 0) || 0;
            setElementText('latence-moyenne', latenceMoyenne > 0 ? latenceMoyenne + ' ms' : '-- ms');

            console.log('✅ [SÉNÉGAL] Statistiques mises à jour');

            const kitData = getValue(data, 'kit', {});
            if (kitData) {
                kitConnected = getValue(kitData, 'accessible', false);
            }

        } else {
            console.warn('⚠️ [SÉNÉGAL] Statistiques non disponibles, statut:', dataStatus);
        }

    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur chargement statistiques:', error);

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

// ✅ CHARGEMENT MANIFESTES SÉNÉGAL - AMÉLIORÉ
async function chargerManifestes() {
    try {
        const response = await fetch(`${API_BASE}/manifeste/lister?limite=20`, {
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        const dataStatus = getValue(data, 'status', 'ERROR');
        const manifestes = getValue(data, 'manifestes', []);

        if (dataStatus === 'SUCCESS' && Array.isArray(manifestes)) {
            // ✅ NOUVEAU: Stocker dans cache global
            tousLesManifestes = manifestes;
            
            // ✅ NOUVEAU: Afficher manifestes à apurer en priorité
            afficherManifestesAApurer(manifestes);
            
            // ✅ NOUVEAU: Mettre à jour les compteurs de filtres
            mettreAJourCompteursFiltre(manifestes);
            
            // Afficher selon filtre actif
            afficherManifestesFiltrés(manifestes);
            
        } else {
            const container = document.getElementById('manifestes-list');
            if (container) {
                container.innerHTML = '<p>Aucun manifeste trouvé au Port de Dakar</p>';
            }
            
            // Empty state pour manifestes à apurer
            const containerApurer = document.getElementById('manifestes-a-apurer-list');
            if (containerApurer) {
                containerApurer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⏳</div>
                        <p>Aucun manifeste en attente d'apurement</p>
                        <small>Les manifestes apparaîtront ici après réception de l'autorisation depuis le Mali (ÉTAPE 17)</small>
                    </div>
                `;
            }
        }

    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur chargement manifestes:', error);
        const container = document.getElementById('manifestes-list');
        if (container) {
            container.innerHTML = '<p style="color: #ffc107;">⚠️ Erreur de chargement des manifestes</p>';
        }
    }
}

// ✅ NOUVEAU: Afficher manifestes prêts pour apurement
function afficherManifestesAApurer(manifestes) {
    const container = document.getElementById('manifestes-a-apurer-list');
    const badge = document.getElementById('count-a-apurer');
    
    if (!container) return;
    
    // Filtrer manifestes prêts pour apurement
    const manifestesApurables = manifestes.filter(m => 
        m.statut === 'DECLARATION_RECUE' && 
        m.declaration && 
        m.declaration.reçue &&
        !m.apurement?.effectue
    );
    
    // Mettre à jour le badge
    if (badge) {
        if (manifestesApurables.length > 0) {
            badge.textContent = manifestesApurables.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    if (manifestesApurables.length > 0) {
        container.innerHTML = manifestesApurables.map(manifeste => {
            const numeroManifeste = getValue(manifeste, 'numero_manif', null) || getValue(manifeste, 'numeroManifeste', 'N/A');
            const consignataire = getValue(manifeste, 'consignataire', null) || getValue(manifeste, 'transporteur', 'N/A');
            const navire = getValue(manifeste, 'navire', 'N/A');
            const montantAcquitte = getValue(manifeste, 'declaration.montantAcquitte', 0);
            const paysDeclarant = getValue(manifeste, 'declaration.paysDeclarant', 'N/A');
            const dateReception = getValue(manifeste, 'declaration.dateReception', null);
            const referencePaiement = getValue(manifeste, 'declaration.referencePaiement', 'N/A');
            
            return `
                <div class="manifeste-item ready-for-apurement">
                    <div class="manifeste-header">
                        <span>N°${numeroManifeste} - ${consignataire}</span>
                        <span class="transmission-status ready-apurement">🔓 PRÊT APUREMENT</span>
                    </div>
                    <div class="manifeste-details">
                        🚢 ${navire}<br>
                        💰 Montant acquitté: ${montantAcquitte.toLocaleString()} FCFA<br>
                        🏳️ Pays déclarant: ${paysDeclarant}<br>
                        📅 Reçu le: ${dateReception ? new Date(dateReception).toLocaleString('fr-FR') : 'N/A'}<br>
                        📋 Réf. paiement: ${referencePaiement}
                    </div>
                    <div class="manifeste-actions">
                        <button class="btn btn-apurement" onclick="ouvrirApurement('${numeroManifeste}', '${referencePaiement}')">
                            🔓 Traiter Apurement (Étapes 18-19)
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <p>Aucun manifeste en attente d'apurement</p>
                <small>Les manifestes apparaîtront ici après réception de l'autorisation depuis le Mali (ÉTAPE 17)</small>
            </div>
        `;
    }
}

// ✅ NOUVEAU: Mettre à jour compteurs de filtres
function mettreAJourCompteursFiltre(manifestes) {
    const countTous = manifestes.length;
    const countPrets = manifestes.filter(m => 
        m.statut === 'DECLARATION_RECUE' && !m.apurement?.effectue
    ).length;
    const countTransmis = manifestes.filter(m => 
        m.statut === 'TRANSMIS_VERS_DESTINATION'
    ).length;
    // ✅ CORRECTION: Inclure aussi MAINLEVEE_ATTRIBUEE dans les apurés
    const countApures = manifestes.filter(m => 
        m.statut === 'APURE' || m.statut === 'MAINLEVEE_ATTRIBUEE' || m.apurement?.effectue
    ).length;
    
    setElementText('count-tous', countTous);
    setElementText('count-prets', countPrets);
    setElementText('count-transmis', countTransmis);
    setElementText('count-apures', countApures);
}

// ✅ NOUVEAU: Afficher manifestes selon filtre
function afficherManifestesFiltrés(manifestes) {
    const container = document.getElementById('manifestes-list');
    if (!container) return;
    
    let manifestesFiltres = manifestes;
    
    if (currentFilter !== 'TOUS') {
        manifestesFiltres = manifestes.filter(m => {
            if (currentFilter === 'DECLARATION_RECUE') {
                return m.statut === 'DECLARATION_RECUE' && !m.apurement?.effectue;
            }
            // ✅ CORRECTION: Filtre APURE inclut aussi MAINLEVEE_ATTRIBUEE
            if (currentFilter === 'APURE') {
                return m.statut === 'APURE' || m.statut === 'MAINLEVEE_ATTRIBUEE' || m.apurement?.effectue;
            }
            return m.statut === currentFilter;
        });
    }
    
    if (manifestesFiltres.length > 0) {
        container.innerHTML = manifestesFiltres.map(manifeste => genererHTMLManifeste(manifeste)).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>Aucun manifeste avec le filtre "${currentFilter}"</p>
            </div>
        `;
    }
}

// ✅ NOUVEAU: Générer HTML pour un manifeste
function genererHTMLManifeste(manifeste) {
    const transmission = getValue(manifeste, 'transmission', {});
    const reussie = getValue(transmission, 'reussie', false);
    const statutTransmission = getValue(transmission, 'statut', 'UNKNOWN');
    const statut = getValue(manifeste, 'statut', 'UNKNOWN');
    
    let transmissionClass = reussie ? 'transmitted' :
                           statutTransmission === 'ERREUR' ? 'error' : '';
    
    // ✅ NOUVEAU: Classe spéciale pour manifestes prêts à apurer
    if (statut === 'DECLARATION_RECUE' && manifeste.declaration?.reçue && !manifeste.apurement?.effectue) {
        transmissionClass = 'ready-for-apurement';
    }
    
    // ✅ CORRECTION: Badge pour manifestes apurés avec main levée
    let statusBadge;
    if (statut === 'MAINLEVEE_ATTRIBUEE' || manifeste.mainlevee?.attribuee) {
        statusBadge = '<span class="transmission-status success">✅ Apuré + Main Levée</span>';
    } else if (statut === 'APURE') {
        statusBadge = '<span class="transmission-status success">✅ Apuré</span>';
    } else if (statut === 'DECLARATION_RECUE' && !manifeste.apurement?.effectue) {
        statusBadge = '<span class="transmission-status ready-apurement">🔓 PRÊT APUREMENT</span>';
    } else if (reussie) {
        statusBadge = '<span class="transmission-status success">✅ Transmis Kit</span>';
    } else if (statutTransmission === 'ERREUR') {
        statusBadge = '<span class="transmission-status error">❌ Erreur Kit</span>';
    } else {
        statusBadge = '<span class="transmission-status pending">⏳ En attente</span>';
    }

    const numeroManifeste = getValue(manifeste, 'numero_manif', null) || getValue(manifeste, 'numeroManifeste', 'N/A');
    const consignataire = getValue(manifeste, 'consignataire', null) || getValue(manifeste, 'transporteur', 'N/A');
    const navire = getValue(manifeste, 'navire', 'N/A');
    const nombreArticles = getValue(manifeste, 'nbre_article', 0) || getValue(manifeste, 'marchandises.nombre', 0);
    const dateCreation = getValue(manifeste, 'dateCreation', null);
    
    // ✅ CORRECTION: Afficher info apurement si effectué
    let infoApurement = '';
    if (manifeste.apurement?.effectue) {
        const dateApurement = getValue(manifeste, 'apurement.dateApurement', null);
        const agent = getValue(manifeste, 'apurement.agentConfirmation', 'N/A');
        infoApurement = `
            <div style="margin-top: 10px; padding: 10px; background: #d4edda; border-radius: 5px; font-size: 0.85em;">
                🔓 Apuré le ${dateApurement ? new Date(dateApurement).toLocaleString('fr-FR') : 'N/A'}<br>
                👤 Agent: ${agent}
            </div>
        `;
    }
    
    // ✅ NOUVEAU: Bouton apurement si éligible
    let boutonApurement = '';
    if (statut === 'DECLARATION_RECUE' && manifeste.declaration?.reçue && !manifeste.apurement?.effectue) {
        const referencePaiement = getValue(manifeste, 'declaration.referencePaiement', 'N/A');
        boutonApurement = `
            <div class="manifeste-actions">
                <button class="btn btn-apurement" onclick="ouvrirApurement('${numeroManifeste}', '${referencePaiement}')">
                    🔓 Traiter Apurement
                </button>
            </div>
        `;
    }
    
    return `
        <div class="manifeste-item ${transmissionClass}">
            <div class="manifeste-header">
                <span>N°${numeroManifeste} - ${consignataire}</span>
            </div>
            <div class="manifeste-details">
                🚢 ${navire}<br>
                📦 ${nombreArticles} article(s)<br>
                📅 ${dateCreation ? new Date(dateCreation).toLocaleString('fr-FR') : 'N/A'}<br>
                ${statusBadge}
                ${infoApurement}
            </div>
            ${boutonApurement}
        </div>
    `;
}

// ✅ NOUVEAU: Filtrer manifestes par statut
window.filtrerManifestes = function(filtre) {
    currentFilter = filtre;
    
    // Mettre à jour les onglets actifs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`filter-${filtre.toLowerCase()}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Réafficher avec nouveau filtre
    afficherManifestesFiltrés(tousLesManifestes);
};

// Ajouter une marchandise transit
function ajouterMarchandiseTransit() {
    marchandiseTransitCount++;
    const container = document.getElementById('transit-marchandises-container');
    const marchandiseDiv = document.createElement('div');
    marchandiseDiv.className = 'marchandise-transit-section';
    marchandiseDiv.setAttribute('data-marchandise', marchandiseTransitCount - 1);
    
    marchandiseDiv.innerHTML = `
        <h4>Marchandise ${marchandiseTransitCount} 
            <button type="button" onclick="supprimerMarchandiseTransit(${marchandiseTransitCount - 1})" 
                    style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; margin-left: 10px;">❌</button>
        </h4>
        <div class="form-row">
            <input type="text" name="designation" placeholder="Désignation marchandise" required>
            <input type="number" name="poids" placeholder="Poids total (kg)" step="0.01" required>
        </div>
        <div class="form-row">
            <input type="number" name="nombreColis" placeholder="Nombre de colis" required>
            <input type="text" name="marques" placeholder="Marques et numéros">
        </div>
    `;
    
    container.appendChild(marchandiseDiv);
}

function supprimerMarchandiseTransit(marchandiseIndex) {
    const marchandiseDiv = document.querySelector(`[data-marchandise="${marchandiseIndex}"]`);
    if (marchandiseDiv && document.querySelectorAll('.marchandise-transit-section').length > 1) {
        marchandiseDiv.remove();
    } else {
        afficherNotification('⚠️ Au moins une marchandise est requise', 'warning');
    }
}

// Créer déclaration transit - ÉTAPES 1-6
async function creerDeclarationTransit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('btn-submit-transit');
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div> Étapes 1-6 en cours...';
    
    try {
        console.log('🚛 [SÉNÉGAL] DÉBUT WORKFLOW TRANSIT - Création déclaration');
        
        // Collecter données transit
        const transitData = {
            numeroDeclaration: getFieldValue('transit-numero'),
            transporteur: getFieldValue('transit-transporteur'),
            modeTransport: getFieldValue('transit-mode'),
            paysDestination: getFieldValue('transit-destination'),
            itineraire: getFieldValue('transit-itineraire'),
            delaiRoute: getFieldValue('transit-delai'),
            cautionRequise: parseFloat(getFieldValue('transit-caution', '0')) || 0,
            referenceCaution: getFieldValue('transit-ref-caution'),
            marchandises: []
        };
        
        // Collecter marchandises
        const marchandiseSections = document.querySelectorAll('.marchandise-transit-section');
        marchandiseSections.forEach(section => {
            const marchandise = {
                designation: section.querySelector('input[name="designation"]')?.value || '',
                poids: parseFloat(section.querySelector('input[name="poids"]')?.value) || 0,
                nombreColis: parseInt(section.querySelector('input[name="nombreColis"]')?.value) || 1,
                marques: section.querySelector('input[name="marques"]')?.value || ''
            };
            transitData.marchandises.push(marchandise);
        });
        
        // Validation
        if (!transitData.numeroDeclaration || !transitData.transporteur || !transitData.paysDestination) {
            throw new Error('Informations transit incomplètes');
        }
        
        if (transitData.marchandises.length === 0) {
            throw new Error('Au moins une marchandise requise');
        }
        
        ajouterInteraction('🚛 ÉTAPES 1-6: Création transit',
            `Transit ${transitData.numeroDeclaration} → ${transitData.paysDestination}`);
        
        // Appel API
        const response = await fetch(API_BASE + '/transit/creer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-Country': 'SEN',
                'X-Source-System': 'SENEGAL_TRANSIT_FRONTEND'
            },
            body: JSON.stringify(transitData),
            signal: AbortSignal.timeout(90000)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'SUCCESS' || result.status === 'PARTIAL_SUCCESS') {
            afficherNotification('🚛 ✅ Déclaration transit créée - Étapes 1-6 terminées!', 'success');
            
            const transitId = result.transit?.numeroDeclaration;
            const kitReussi = result.transmissionKit?.reussie;
            
            if (kitReussi) {
                ajouterInteraction('🚀 ÉTAPES 10-11: Transmission Kit',
                    `✅ Copie transit transmise vers Mali - Transit ${transitId}`);
            } else {
                ajouterInteraction('⚠️ ÉTAPES 10-11: Kit d\'Interconnexion',
                    `Copie non transmise - Mode local uniquement`);
            }
            
            // Reset formulaire
            document.getElementById('transit-form').reset();
            
            // Recharger données
            await chargerTransits();
            await chargerStatistiques();
            
        } else {
            throw new Error(result.message || 'Erreur création transit');
        }
        
    } catch (error) {
        console.error('🚛 [SÉNÉGAL] Erreur workflow transit:', error);
        afficherNotification('🚛 ❌ Erreur: ' + error.message, 'error');
        ajouterInteraction('❌ Workflow Transit', `Erreur: ${error.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// Charger liste transits
async function chargerTransits() {
    try {
        const response = await fetch(`${API_BASE}/transit/lister?limite=20`, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'SUCCESS' && Array.isArray(data.transits)) {
            const container = document.getElementById('transits-list');
            if (!container) return;
            
            if (data.transits.length > 0) {
                container.innerHTML = data.transits.map(transit => `
                    <div class="manifeste-item transmitted">
                        <div class="manifeste-header">
                            <span>🚛 ${transit.numeroDeclaration} - ${transit.transporteur}</span>
                            <span class="transmission-status ${transit.statut === 'ARRIVEE_CONFIRMEE' ? 'success' : 'pending'}">
                                ${transit.statut === 'ARRIVEE_CONFIRMEE' ? '✅ Arrivée confirmée' : 
                                  transit.statut === 'TRANSIT_APURE' ? '✅ Apuré' : '⏳ En transit'}
                            </span>
                        </div>
                        <div class="manifeste-details">
                            🎯 Destination: ${transit.paysDestination}<br>
                            🚚 Mode: ${transit.modeTransport}<br>
                            📍 Itinéraire: ${transit.itineraire}<br>
                            ⏱️ Délai: ${transit.delaiRoute}<br>
                            📦 Marchandises: ${transit.marchandises.nombre} (${transit.marchandises.poidsTotal.toLocaleString()} kg)<br>
                            📅 Créé le: ${new Date(transit.dateCreation).toLocaleString('fr-FR')}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>Aucune déclaration transit</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ [SÉNÉGAL] Erreur chargement transits:', error);
    }
}

// ✅ TEST CONNEXION KIT D'INTERCONNEXION
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test Kit d\'Interconnexion', 'Test de connectivité...');
    afficherNotification('🔧 Test Kit en cours...', 'info');

    try {
        console.log('🔧 [SÉNÉGAL] Test Kit d\'Interconnexion avec retry...');

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
                    afficherNotification(`✅ Kit d'Interconnexion accessible (${latence}ms) - Tentative ${i + 1}`, 'success');
                    ajouterInteraction('🔧 Test Kit', `✅ Succès tentative ${i + 1} - Latence: ${latence}ms`);
                    return true;
                } else {
                    throw new Error(erreur || 'Kit inaccessible selon health check');
                }

            } catch (tentativeError) {
                dernièreErreur = tentativeError;
                console.warn(`⚠️ [SÉNÉGAL] Tentative ${i + 1} échouée:`, tentativeError.message);

                if (i < tentatives.length - 1) {
                    console.log(`⏳ [SÉNÉGAL] Attente 3s avant tentative ${i + 2}...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        throw new Error(`Toutes les tentatives échouées. Dernière erreur: ${dernièreErreur?.message || 'Erreur inconnue'}`);

    } catch (error) {
        console.error('❌ [SÉNÉGAL] Test Kit échoué:', error);

        let errorMessage = error.message || 'Erreur inconnue';

        if (errorMessage.includes('signal timed out')) {
            errorMessage = 'Timeout - Kit d\'Interconnexion met trop de temps à répondre';
        } else if (errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Impossible de joindre le Kit d\'Interconnexion';
        } else if (errorMessage.includes('NetworkError')) {
            errorMessage = 'Erreur réseau - Kit d\'Interconnexion indisponible';
        }

        afficherNotification(`❌ Kit inaccessible: ${errorMessage}`, 'error');
        ajouterInteraction('🔧 Test Kit', `❌ Échec: ${errorMessage}`);
        return false;
    }
}

// ✅ DIAGNOSTIC COMPLET
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Diagnostic Port de Dakar...');
    afficherNotification('🩺 Diagnostic en cours...', 'info');

    const resultats = {
        serviceSenegal: false,
        kitInterconnexion: false,
        baseDonnees: false
    };

    try {
        try {
            console.log('🩺 [SÉNÉGAL] Test service local...');
            const healthResponse = await fetch(`${API_BASE}/health`, {
                signal: AbortSignal.timeout(10000)
            });
            resultats.serviceSenegal = healthResponse.ok;

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                const kitInfo = getValue(healthData, 'kit', {});
                resultats.kitInterconnexion = getValue(kitInfo, 'accessible', false);
            }
        } catch (healthError) {
            console.warn('🩺 [SÉNÉGAL] Erreur test santé:', healthError);
        }

        try {
            console.log('🩺 [SÉNÉGAL] Test base de données...');
            const statsResponse = await fetch(`${API_BASE}/statistiques`, {
                signal: AbortSignal.timeout(10000)
            });
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                resultats.baseDonnees = !!getValue(statsData, 'statistiques', null);
            }
        } catch (statsError) {
            console.warn('🩺 [SÉNÉGAL] Erreur test BDD:', statsError);
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

    } catch (error) {
        const errorMessage = error.message || 'Erreur inconnue';
        ajouterInteraction('🩺 Diagnostic', `❌ Erreur - ${errorMessage}`);
        afficherNotification('❌ Diagnostic échoué', 'error');
    }
}

// ✅ FONCTIONS APUREMENT (ÉTAPES 18-19)
window.ouvrirApurement = async function (numeroManifeste, referencePaiement) {
    console.log('🔓 [SÉNÉGAL] Ouverture interface apurement:', { numeroManifeste, referencePaiement });

    document.getElementById('apurement-section').style.display = 'block';
    document.getElementById('apurement-info').style.display = 'none';
    document.getElementById('apurement-loading').style.display = 'block';
    document.getElementById('apurement-error').style.display = 'none';
    document.getElementById('apurement-success').style.display = 'none';

    window.apurementData = { numeroManifeste, referencePaiement };
    document.getElementById('apurement-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const response = await fetch(`${API_BASE}/apurement/traiter?numeroManifeste=${numeroManifeste}&referencePaiement=${referencePaiement}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'SENEGAL_FRONTEND',
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

            if (data.apurement) {
                throw new Error('Ce manifeste a déjà été apuré le ' + new Date(data.apurement.dateApurement).toLocaleString('fr-FR'));
            }

            if (!data.peutEtreApure) {
                throw new Error('Ce manifeste ne peut pas être apuré. Statut: ' + data.manifeste.statut);
            }

            document.getElementById('apu-numero-manifeste').textContent = data.manifeste.numero;
            document.getElementById('apu-navire').textContent = data.manifeste.navire;
            document.getElementById('apu-transporteur').textContent = data.manifeste.consignataire;
            document.getElementById('apu-montant').textContent = data.autorisation.montant.toLocaleString();
            document.getElementById('apu-pays').textContent = data.autorisation.paysDeclarant;
            document.getElementById('apu-date-mainlevee').textContent = new Date(data.autorisation.dateReception).toLocaleString('fr-FR');

            document.getElementById('type-confirmation').value = 'DOUANE';
            document.getElementById('agent-confirmation').value = '';
            document.getElementById('observations').value = '';

            document.getElementById('apurement-loading').style.display = 'none';
            document.getElementById('apurement-info').style.display = 'block';

            ajouterInteraction('🔓 Apurement', `Interface ouverte pour manifeste ${numeroManifeste}`);

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

async function confirmerApurement() {
    const btnConfirmer = document.getElementById('btn-confirmer-apurement');
    const originalText = btnConfirmer.innerHTML;

    try {
        const agentConfirmation = document.getElementById('agent-confirmation').value.trim();
        if (!agentConfirmation) {
            throw new Error('Veuillez saisir le nom de l\'agent de confirmation');
        }

        btnConfirmer.disabled = true;
        btnConfirmer.innerHTML = '<div class="loading"></div> Étapes 18-19 en cours...';

        const apurementPayload = {
            numeroManifeste: window.apurementData.numeroManifeste,
            referencePaiement: window.apurementData.referencePaiement,
            typeConfirmation: document.getElementById('type-confirmation').value,
            agentConfirmation: agentConfirmation,
            observations: document.getElementById('observations').value.trim()
        };

        console.log('📤 [SÉNÉGAL] Envoi apurement:', apurementPayload);

        const response = await fetch(`${API_BASE}/apurement/traiter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'SENEGAL_FRONTEND',
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
        console.log('✅ [SÉNÉGAL] Apurement confirmé:', result);

        if (result.status === 'SUCCESS') {
            document.getElementById('apurement-info').style.display = 'none';
            document.getElementById('apurement-success').style.display = 'block';

            document.getElementById('success-manifeste').textContent = result.apurement.numeroManifeste;
            document.getElementById('success-ref-apurement').textContent = result.bonEnlever.id;
            document.getElementById('success-type-confirmation').textContent = result.apurement.typeConfirmation;
            document.getElementById('success-agent').textContent = apurementPayload.agentConfirmation;
            document.getElementById('success-date').textContent = new Date(result.apurement.dateApurement).toLocaleString('fr-FR');

            afficherNotification('✅ Workflow Sénégal terminé - Étapes 18-19 complétées!', 'success');
            ajouterInteraction('✅ ÉTAPES 18-19', `Apurement et levée confirmés - Manifeste ${result.apurement.numeroManifeste}`);

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

function fermerApurement() {
    document.getElementById('apurement-section').style.display = 'none';
    window.apurementData = null;

    if (window.opener) {
        window.close();
    }
}

// ✅ FONCTIONS UTILITAIRES
async function chargerDonnees() {
    try {
        await Promise.allSettled([
            chargerStatistiques().catch(err => console.warn('[SÉNÉGAL] Erreur stats:', err)),
            chargerManifestes().catch(err => console.warn('[SÉNÉGAL] Erreur manifestes:', err))
        ]);
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
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const numeroManifeste = urlParams.get('apurement_manifeste');
    const referencePaiement = urlParams.get('apurement_paiement');
    // Ajouter handler formulaire transit
    const transitForm = document.getElementById('transit-form');
    if (transitForm) {
        transitForm.addEventListener('submit', creerDeclarationTransit);
    }

    if (numeroManifeste && referencePaiement) {
        console.log('🔓 [SÉNÉGAL] Ouverture apurement depuis URL');
        setTimeout(() => {
            window.ouvrirApurement(numeroManifeste, referencePaiement);
        }, 1000);
    }

    // Charger transits
    chargerTransits();
});

// Cleanup
window.addEventListener('beforeunload', () => {
    try {
        if (statusInterval) clearInterval(statusInterval);
        if (refreshInterval) clearInterval(refreshInterval);
    } catch (error) {
        console.warn('[SÉNÉGAL] Erreur cleanup:', error);
    }
});

console.log('🇸🇳 ✅ Script Système Douanier Sénégal - Port de Dakar initialisé');