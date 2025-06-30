// ============================================================================
// PAYS A - Script Frontend CORRIGÉ avec Tests Hybrides
// Fichier: public/script.js
// ============================================================================

// Configuration API - PAYS A CORRIGÉ
const API_BASE = window.location.origin + '/api';
const KIT_MULESOFT_URL = 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io/api/v1';
window.SYSTEME_TYPE = 'PAYS_A';
window.PAYS_CODE = 'CIV';

let statusInterval;
let refreshInterval;
let kitConnected = false;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Pays A - Monitoring Kit MuleSoft avec Tests Hybrides');
    
    // Définir la date par défaut
    document.getElementById('dateArrivee').value = new Date().toISOString().split('T')[0];
    document.getElementById('init-time').textContent = new Date().toLocaleTimeString();
    
    // Vérifications périodiques
    verifierStatutKit();
    statusInterval = setInterval(verifierStatutKit, 15000);
    
    // Actualisation données
    chargerDonnees();
    refreshInterval = setInterval(chargerDonnees, 10000);
    
    // Gestionnaire de formulaire
    document.getElementById('manifeste-form').addEventListener('submit', creerManifeste);
    
    ajouterInteraction('🏗️ Service démarré', 'Pays A opérationnel - Monitoring Kit activé');
});

// Vérification du statut Kit (via API locale pour le monitoring continu)
async function verifierStatutKit() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        const kitInfo = data.kit;
        const banner = document.getElementById('kit-banner');
        const indicator = document.getElementById('kit-indicator');
        const statusText = document.getElementById('kit-status-text');
        const details = document.getElementById('kit-details');
        
        if (kitInfo.accessible) {
            // Kit connecté
            banner.className = 'kit-status-banner connected';
            banner.innerHTML = `✅ Kit d'Interconnexion opérationnel - ${kitInfo.status} (${kitInfo.latence}ms)`;
            
            indicator.className = 'status-indicator connected';
            statusText.textContent = 'Kit Opérationnel';
            details.textContent = `Latence: ${kitInfo.latence}ms`;
            
            kitConnected = true;
        } else {
            // Kit déconnecté
            banner.className = 'kit-status-banner disconnected';
            banner.innerHTML = `❌ Kit d'Interconnexion inaccessible - Vérifiez la connectivité`;
            
            indicator.className = 'status-indicator';
            statusText.textContent = 'Kit Inaccessible';
            details.textContent = 'Erreur de connexion';
            
            kitConnected = false;
        }
        
    } catch (error) {
        console.error('Erreur vérification Kit:', error);
        kitConnected = false;
    }
}

// ✅ CORRECTION MAJEURE: Test de connexion Kit HYBRIDE (Direct + Proxy)
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test connexion Kit', 'Test hybride: Direct + Proxy serveur...');
    afficherNotification('🔧 Test Kit en cours (Direct + Proxy)...', 'info');
    
    const resultats = {
        testDirect: null,
        testProxy: null,
        recommendation: ''
    };
    
    // === TEST 1: DIRECT vers MuleSoft (pour diagnostiquer CORS) ===
    console.log('🔍 Test 1: Browser → Kit MuleSoft (Direct)');
    try {
        const startTime = Date.now();
        const response = await fetch(`${KIT_MULESOFT_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'PAYS_A_DASHBOARD',
                'X-Source-Country': window.PAYS_CODE,
                'User-Agent': 'PaysA-Dashboard/1.0'
            },
            signal: AbortSignal.timeout(8000)
        });
        
        const latence = Date.now() - startTime;
        
        if (response.ok) {
            const data = await response.json();
            resultats.testDirect = {
                success: true,
                latence,
                status: response.status,
                version: data.version || 'N/A',
                methode: 'DIRECT_BROWSER'
            };
            console.log('✅ Test Direct réussi:', resultats.testDirect);
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        resultats.testDirect = {
            success: false,
            latence: 0,
            erreur: error.message,
            methode: 'DIRECT_BROWSER'
        };
        console.log('❌ Test Direct échoué:', resultats.testDirect);
    }
    
    // === TEST 2: VIA PROXY SERVEUR ===
    console.log('🔍 Test 2: Browser → API Locale → Kit MuleSoft (Proxy)');
    try {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE}/kit/test?type=health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(15000) // Plus de temps pour le proxy
        });
        
        const latence = Date.now() - startTime;
        const data = await response.json();
        
        if (response.ok && data.status === 'SUCCESS') {
            resultats.testProxy = {
                success: true,
                latence,
                latenceKit: data.resultat?.latence || 0,
                version: data.resultat?.version || 'N/A',
                methode: 'PROXY_SERVEUR'
            };
            console.log('✅ Test Proxy réussi:', resultats.testProxy);
        } else {
            throw new Error(data.message || 'Erreur proxy');
        }
        
    } catch (error) {
        resultats.testProxy = {
            success: false,
            latence: 0,
            erreur: error.message,
            methode: 'PROXY_SERVEUR'
        };
        console.log('❌ Test Proxy échoué:', resultats.testProxy);
    }
    
    // === ANALYSE DES RÉSULTATS ===
    if (resultats.testDirect.success && resultats.testProxy.success) {
        resultats.recommendation = 'Les deux méthodes fonctionnent - CORS autorisé';
        afficherNotification(`✅ Kit accessible - Direct: ${resultats.testDirect.latence}ms | Proxy: ${resultats.testProxy.latence}ms`, 'success');
        ajouterInteraction('🔧 Test Kit', `✅ Succès complet - Direct: ${resultats.testDirect.latence}ms, Proxy: ${resultats.testProxy.latence}ms`);
        kitConnected = true;
    } else if (!resultats.testDirect.success && resultats.testProxy.success) {
        resultats.recommendation = 'Seul le proxy fonctionne - CORS bloqué par navigateur';
        afficherNotification(`⚠️ Kit accessible via proxy uniquement (${resultats.testProxy.latence}ms) - CORS bloqué`, 'warning');
        ajouterInteraction('🔧 Test Kit', `⚠️ Proxy OK (${resultats.testProxy.latence}ms) - Direct bloqué: ${resultats.testDirect.erreur}`);
        kitConnected = true; // Via proxy
    } else if (resultats.testDirect.success && !resultats.testProxy.success) {
        resultats.recommendation = 'Direct OK mais proxy KO - Problème configuration serveur';
        afficherNotification(`⚠️ Kit accessible direct uniquement (${resultats.testDirect.latence}ms) - Proxy défaillant`, 'warning');
        ajouterInteraction('🔧 Test Kit', `⚠️ Direct OK (${resultats.testDirect.latence}ms) - Proxy KO: ${resultats.testProxy.erreur}`);
        kitConnected = true; // Via direct
    } else {
        resultats.recommendation = 'Kit MuleSoft complètement inaccessible';
        afficherNotification('❌ Kit MuleSoft inaccessible par toutes les méthodes', 'error');
        ajouterInteraction('🔧 Test Kit', `❌ Échec total - Direct: ${resultats.testDirect.erreur}, Proxy: ${resultats.testProxy.erreur}`);
        kitConnected = false;
    }
    
    console.log('📊 Résultat final du test hybride:', resultats);
    return resultats;
}

// ✅ NOUVEAU: Diagnostic complet Kit MuleSoft avec tests hybrides
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Démarrage diagnostic complet Kit MuleSoft...');
    afficherNotification('🩺 Diagnostic Kit en cours...', 'info');
    
    try {
        // Utiliser le proxy serveur pour le diagnostic (plus fiable)
        const response = await fetch(`${API_BASE}/kit/test?type=diagnostic`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(30000) // 30 secondes pour diagnostic complet
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'SUCCESS') {
            const diagnostic = data.resultat;
            const testsReussis = Object.values(diagnostic.tests || {}).filter(t => t.success).length;
            const totalTests = Object.keys(diagnostic.tests || {}).length;
            
            const message = `Terminé - ${testsReussis}/${totalTests} tests réussis`;
            ajouterInteraction('🩺 Diagnostic', message);
            
            if (testsReussis > 0) {
                afficherNotification(`✅ Kit opérationnel - ${message}`, 'success');
            } else {
                afficherNotification(`❌ Kit défaillant - ${message}`, 'error');
            }
            
            console.log('📊 Diagnostic Kit complet:', diagnostic);
        } else {
            throw new Error(data.message || 'Diagnostic échoué');
        }
        
    } catch (error) {
        ajouterInteraction('🩺 Diagnostic', `❌ Erreur - ${error.message}`);
        afficherNotification('❌ Diagnostic Kit échoué', 'error');
        console.error('Erreur diagnostic:', error);
    }
}

// ✅ NOUVEAU: Test avancé - Transmission manifeste vers Kit
async function testerTransmissionKit() {
    ajouterInteraction('📦 Test transmission', 'Test envoi manifeste vers Kit...');
    
    try {
        const response = await fetch(`${API_BASE}/kit/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'transmission_test',
                payload: {}
            }),
            signal: AbortSignal.timeout(15000)
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'SUCCESS') {
            afficherNotification('✅ Test transmission manifeste réussi', 'success');
            ajouterInteraction('📦 Test transmission', `✅ Succès - Latence: ${data.resultat?.latence || 'N/A'}ms`);
        } else {
            throw new Error(data.message || 'Test transmission échoué');
        }
        
    } catch (error) {
        afficherNotification('❌ Test transmission échoué: ' + error.message, 'error');
        ajouterInteraction('📦 Test transmission', `❌ Échec - ${error.message}`);
    }
}

// Création de manifeste (reste inchangé mais avec gestion d'erreur améliorée)
async function creerManifeste(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('btn-submit');
    const originalText = submitBtn.innerHTML;
    
    // Disable button et show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div> Transmission en cours...';
    
    const manifeste = {
        numeroManifeste: document.getElementById('numeroManifeste').value,
        transporteur: document.getElementById('transporteur').value,
        navire: document.getElementById('navire').value,
        portEmbarquement: document.getElementById('portEmbarquement').value,
        portDebarquement: document.getElementById('portDebarquement').value,
        dateArrivee: document.getElementById('dateArrivee').value,
        marchandises: [{
            codeSH: document.getElementById('codeSH').value,
            designation: document.getElementById('designation').value,
            poidsBrut: parseFloat(document.getElementById('poidsBrut').value),
            nombreColis: parseInt(document.getElementById('nombreColis').value),
            destinataire: document.getElementById('destinataire').value,
            paysDestination: document.getElementById('paysDestination').value
        }]
    };
    
    ajouterInteraction('📋 Création manifeste', `${manifeste.numeroManifeste} vers ${manifeste.marchandises[0].paysDestination}`);
    
    try {
        const response = await fetch(`${API_BASE}/manifeste/creer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(manifeste)
        });
        
        const result = await response.json();
        
        if (result.status === 'SUCCESS') {
            afficherNotification('✅ Manifeste créé et transmis au Kit avec succès!', 'success');
            ajouterInteraction('🚀 Transmission Kit', 
                `✅ Succès - ${result.manifeste.id} (${result.transmission.latence}ms)`);
            
            // Reset form
            document.getElementById('manifeste-form').reset();
            document.getElementById('dateArrivee').value = new Date().toISOString().split('T')[0];
            
        } else if (result.status === 'PARTIAL_SUCCESS') {
            afficherNotification('⚠️ Manifeste créé mais erreur transmission Kit', 'error');
            ajouterInteraction('🚀 Transmission Kit', 
                `❌ Échec - ${result.transmission.erreur}`);
        } else {
            throw new Error(result.message);
        }
        
        // Actualiser les données
        setTimeout(chargerDonnees, 1000);
        
    } catch (error) {
        console.error('Erreur création manifeste:', error);
        afficherNotification('❌ Erreur: ' + error.message, 'error');
        ajouterInteraction('📋 Création manifeste', `❌ Erreur: ${error.message}`);
    } finally {
        // Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ===============================
// FONCTIONS UTILITAIRES (inchangées)
// ===============================

// Charger toutes les données
async function chargerDonnees() {
    await Promise.all([
        chargerStatistiques(),
        chargerManifestes()
    ]);
}

// Charger statistiques
async function chargerStatistiques() {
    try {
        const response = await fetch(`${API_BASE}/statistiques`);
        const data = await response.json();
        
        if (data.status === 'SUCCESS') {
            const stats = data.statistiques;
            
            document.getElementById('stat-manifestes').textContent = stats.manifestesCreees;
            document.getElementById('stat-transmissions').textContent = stats.transmissionsKit;
            document.getElementById('stat-succes').textContent = stats.transmissionsReussies;
            document.getElementById('taux-reussite').textContent = stats.tauxReussiteTransmission + '%';
            document.getElementById('latence-moyenne').textContent = 
                stats.performance?.latenceMoyenne > 0 ? stats.performance.latenceMoyenne + ' ms' : '-- ms';
        }
        
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
    }
}

// Charger manifestes
async function chargerManifestes() {
    try {
        const response = await fetch(`${API_BASE}/manifeste/lister?limite=5`);
        const data = await response.json();
        
        const container = document.getElementById('manifestes-list');
        
        if (data.status === 'SUCCESS' && data.manifestes.length > 0) {
            container.innerHTML = data.manifestes.map(manifeste => {
                const transmissionClass = manifeste.transmission?.reussie ? 'transmitted' : 
                                         manifeste.transmission?.statut === 'ERREUR' ? 'error' : '';
                
                const statusBadge = manifeste.transmission?.reussie ? 
                    '<span class="transmission-status success">✅ Transmis Kit</span>' :
                    manifeste.transmission?.statut === 'ERREUR' ? 
                    '<span class="transmission-status error">❌ Erreur Kit</span>' :
                    '<span class="transmission-status pending">⏳ En attente</span>';
                
                return `
                    <div class="manifeste-item ${transmissionClass}">
                        <div class="manifeste-header">
                            ${manifeste.numeroManifeste} - ${manifeste.transporteur}
                        </div>
                        <div class="manifeste-details">
                            📍 ${manifeste.ports.embarquement} → ${manifeste.ports.debarquement}<br>
                            📦 ${manifeste.marchandises.nombre} marchandise(s) → ${manifeste.marchandises.paysDestinations.join(', ')}<br>
                            📅 ${new Date(manifeste.dateCreation).toLocaleString('fr-FR')}<br>
                            ${statusBadge}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p>Aucun manifeste trouvé</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement manifestes:', error);
        document.getElementById('manifestes-list').innerHTML = '<p>Erreur de chargement</p>';
    }
}

// Ajouter interaction
function ajouterInteraction(title, details) {
    const container = document.getElementById('kit-interactions');
    const timestamp = new Date().toLocaleTimeString();
    
    const item = document.createElement('div');
    item.className = 'interaction-item';
    
    // Déterminer la classe selon le contenu
    if (details.includes('❌') || details.includes('Erreur') || details.includes('Échec')) {
        item.classList.add('error');
    } else if (details.includes('⚠️') || details.includes('Partiel')) {
        item.classList.add('warning');
    }
    
    item.innerHTML = `
        <div class="interaction-header">
            <div class="interaction-title">${title}</div>
            <div class="interaction-time">${timestamp}</div>
        </div>
        <div>${details}</div>
    `;
    
    container.prepend(item);
    
    // Garder seulement les 20 dernières interactions
    const items = container.querySelectorAll('.interaction-item');
    if (items.length > 20) {
        items[items.length - 1].remove();
    }
}

// Notification
function afficherNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Fonctions publiques pour les boutons HTML
window.chargerStatistiques = chargerStatistiques;
window.chargerManifestes = chargerManifestes;
window.testerConnexionKit = testerConnexionKit;
window.lancerDiagnostic = lancerDiagnostic;
window.testerTransmissionKit = testerTransmissionKit;

// Cleanup
window.addEventListener('beforeunload', () => {
    if (statusInterval) clearInterval(statusInterval);
    if (refreshInterval) clearInterval(refreshInterval);
});