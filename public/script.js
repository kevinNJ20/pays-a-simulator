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
    console.log('🚀 Initialisation Pays A - Monitoring Kit MuleSoft avec Test Direct');
    
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

// ✅ CORRECTION: Test de connexion Kit DIRECT vers MuleSoft
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test connexion Kit', 'Test connectivité directe vers Kit MuleSoft...');
    
    const startTime = Date.now();
    
    try {
        // ✅ APPEL DIRECT vers le Kit MuleSoft
        const response = await fetch(`${KIT_MULESOFT_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'PAYS_A_DASHBOARD',
                'X-Source-Country': window.PAYS_CODE,
                'User-Agent': 'PaysA-Dashboard/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10 secondes timeout
        });
        
        const latence = Date.now() - startTime;
        
        if (response.ok) {
            const data = await response.json();
            afficherNotification(`✅ Kit MuleSoft accessible - ${response.status} (${latence}ms)`, 'success');
            ajouterInteraction('🔧 Test Kit Direct', `✅ Succès - Latence: ${latence}ms, Version: ${data.version || 'N/A'}`);
            
            // Log détaillé du Kit
            console.log('📊 Réponse Kit MuleSoft:', data);
            
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        const latence = Date.now() - startTime;
        let messageErreur = 'Kit MuleSoft inaccessible';
        
        if (error.name === 'TimeoutError') {
            messageErreur = 'Timeout - Kit MuleSoft ne répond pas (>10s)';
        } else if (error.message.includes('CORS')) {
            messageErreur = 'Erreur CORS - Configuration Kit à vérifier';
        } else if (error.message.includes('Failed to fetch')) {
            messageErreur = 'Erreur réseau - Kit MuleSoft inaccessible';
        } else {
            messageErreur = `Erreur: ${error.message}`;
        }
        
        afficherNotification(`❌ ${messageErreur} (${latence}ms)`, 'error');
        ajouterInteraction('🔧 Test Kit Direct', `❌ Échec - ${messageErreur}`);
    }
}

// ✅ NOUVEAU: Test complet (Direct + Via API locale)
async function testerConnexionKitComplet() {
    ajouterInteraction('🔍 Test complet', 'Test connectivité Kit - Direct + Via API locale');
    
    // Test 1: Direct depuis le browser
    console.log('🔍 Test 1: Connectivité directe browser → Kit MuleSoft');
    const testDirect = await testerKitDirect();
    
    // Test 2: Via l'API locale 
    console.log('🔍 Test 2: Connectivité via API locale → Kit MuleSoft');
    const testViaAPI = await testerKitViaAPI();
    
    // Comparaison des résultats
    const resultats = {
        testDirect: {
            accessible: testDirect.accessible,
            latence: testDirect.latence,
            source: 'Browser → Kit MuleSoft'
        },
        testViaAPI: {
            accessible: testViaAPI.accessible,
            latence: testViaAPI.latence,
            source: 'API Locale → Kit MuleSoft'
        },
        coherent: testDirect.accessible === testViaAPI.accessible
    };
    
    console.log('📊 Comparaison tests Kit:', resultats);
    
    const message = `Direct: ${testDirect.accessible ? '✅' : '❌'} (${testDirect.latence}ms) | ` +
                   `API: ${testViaAPI.accessible ? '✅' : '❌'} (${testViaAPI.latence}ms)`;
    
    ajouterInteraction('🔍 Test complet', message);
    
    if (!resultats.coherent) {
        afficherNotification('⚠️ Résultats incohérents entre test direct et API locale', 'warning');
    } else {
        afficherNotification('✅ Tests cohérents - Connectivité validée', 'success');
    }
    
    return resultats;
}

// Test Kit direct (helper function)
async function testerKitDirect() {
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${KIT_MULESOFT_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'PAYS_A_DASHBOARD',
                'X-Source-Country': window.PAYS_CODE
            },
            signal: AbortSignal.timeout(8000)
        });
        
        const latence = Date.now() - startTime;
        
        return {
            accessible: response.ok,
            latence,
            status: response.status
        };
        
    } catch (error) {
        return {
            accessible: false,
            latence: Date.now() - startTime,
            erreur: error.message
        };
    }
}

// Test Kit via API locale (helper function)  
async function testerKitViaAPI() {
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        const latence = Date.now() - startTime;
        
        return {
            accessible: data.kit?.accessible || false,
            latence: data.kit?.latence || latence
        };
        
    } catch (error) {
        return {
            accessible: false,
            latence: Date.now() - startTime,
            erreur: error.message
        };
    }
}

// ✅ NOUVEAU: Diagnostic complet Kit MuleSoft
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Démarrage diagnostic complet Kit MuleSoft...');
    afficherNotification('🩺 Diagnostic Kit en cours...', 'info');
    
    const diagnostic = {
        timestamp: new Date().toISOString(),
        systeme: window.SYSTEME_TYPE,
        pays: window.PAYS_CODE,
        tests: {}
    };
    
    // Test 1: Health Check
    console.log('🏥 Test Health Check...');
    diagnostic.tests.health = await testerEndpointKit('/health', 'GET');
    
    // Test 2: Console Access
    console.log('🖥️ Test Console Access...');
    diagnostic.tests.console = await testerEndpointKit('/console', 'GET');
    
    // Test 3: Endpoint Transmission Manifeste (spécifique Pays A)
    console.log('📋 Test endpoint transmission manifeste...');
    diagnostic.tests.manifesteTransmission = await testerEndpointKit('/manifeste/transmission', 'POST', {
        numeroManifeste: `TEST_${Date.now()}`,
        transporteur: 'TEST CARRIER',
        dateArrivee: new Date().toISOString().split('T')[0],
        marchandises: [{
            designation: 'Test diagnostic',
            poidsBrut: 1000,
            nombreColis: 1,
            paysDestination: 'BFA'
        }]
    });
    
    // Résumé du diagnostic
    const testsReussis = Object.values(diagnostic.tests).filter(t => t.accessible).length;
    const totalTests = Object.keys(diagnostic.tests).length;
    
    diagnostic.resume = {
        testsReussis,
        totalTests,
        tauxReussite: Math.round((testsReussis / totalTests) * 100),
        kitOperationnel: testsReussis > 0
    };
    
    console.log('📊 Diagnostic Kit terminé:', diagnostic.resume);
    
    const message = `Terminé - ${testsReussis}/${totalTests} tests réussis (${diagnostic.resume.tauxReussite}%)`;
    ajouterInteraction('🩺 Diagnostic', message);
    
    if (diagnostic.resume.kitOperationnel) {
        afficherNotification(`✅ Kit opérationnel - ${message}`, 'success');
    } else {
        afficherNotification(`❌ Kit défaillant - ${message}`, 'error');
    }
    
    return diagnostic;
}

// Utilitaire pour tester un endpoint spécifique du Kit
async function testerEndpointKit(endpoint, method = 'GET', testData = null) {
    const startTime = Date.now();
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Source-System': 'PAYS_A_DASHBOARD',
                'X-Source-Country': window.PAYS_CODE,
                'X-Test-Type': 'DIAGNOSTIC'
            },
            signal: AbortSignal.timeout(5000)
        };
        
        // Pour les tests POST, ajouter des données test
        if (method === 'POST') {
            options.body = JSON.stringify(testData || {
                test: true,
                timestamp: new Date().toISOString(),
                source: 'PAYS_A_DIAGNOSTIC'
            });
        }
        
        const response = await fetch(`${KIT_MULESOFT_URL}${endpoint}`, options);
        const latence = Date.now() - startTime;
        
        return {
            accessible: response.ok,
            status: response.status,
            latence,
            endpoint,
            method
        };
        
    } catch (error) {
        return {
            accessible: false,
            status: 0,
            latence: Date.now() - startTime,
            endpoint,
            method,
            erreur: error.message
        };
    }
}

// Création de manifeste (reste inchangé)
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

// Charger toutes les données (reste inchangé)
async function chargerDonnees() {
    await Promise.all([
        chargerStatistiques(),
        chargerManifestes()
    ]);
}

// Charger statistiques (reste inchangé)
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

// Charger manifestes (reste inchangé)
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

// Ajouter interaction (reste inchangé)
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

// Notification (reste inchangé)
function afficherNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Cleanup (reste inchangé)
window.addEventListener('beforeunload', () => {
    if (statusInterval) clearInterval(statusInterval);
    if (refreshInterval) clearInterval(refreshInterval);
});