// ============================================================================
// PAYS A - Script Frontend COMPLET CORRIGÉ - Toutes erreurs latence fixées
// Fichier: public/script.js - VERSION COMPLÈTE À COPIER-COLLER
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
    console.log('🚀 Initialisation Pays A - Version erreurs corrigées');
    
    // Définir la date par défaut
    const dateElement = document.getElementById('dateArrivee');
    if (dateElement) {
        dateElement.value = new Date().toISOString().split('T')[0];
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
    refreshInterval = setInterval(chargerDonnees, 5000);
    
    // Gestionnaire de formulaire
    const form = document.getElementById('manifeste-form');
    if (form) {
        form.addEventListener('submit', creerManifeste);
    }
    
    ajouterInteraction('🏗️ Service démarré', 'Pays A opérationnel - Version corrigée');
});

// Vérification du statut Kit
async function verifierStatutKit() {
    try {
        const response = await fetch(`${API_BASE}/health`, {
            signal: AbortSignal.timeout(5000)
        });
        const data = await response.json();
        
        const kitInfo = data.kit || {};
        const banner = document.getElementById('kit-banner');
        const indicator = document.getElementById('kit-indicator');
        const statusText = document.getElementById('kit-status-text');
        const details = document.getElementById('kit-details');
        
        if (kitInfo.accessible) {
            // Kit connecté
            if (banner) {
                banner.className = 'kit-status-banner connected';
                banner.innerHTML = `✅ Kit d'Interconnexion opérationnel - ${kitInfo.status || 'UP'} (${kitInfo.latence || 'N/A'}ms)`;
            }
            
            if (indicator) indicator.className = 'status-indicator connected';
            if (statusText) statusText.textContent = 'Kit Opérationnel';
            if (details) details.textContent = `Latence: ${kitInfo.latence || 'N/A'}ms`;
            
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
        console.error('Erreur vérification Kit:', error);
        const banner = document.getElementById('kit-banner');
        if (banner) {
            banner.className = 'kit-status-banner disconnected';
            banner.innerHTML = `⚠️ Impossible de vérifier le Kit - Service local actif`;
        }
        kitConnected = false;
    }
}

// ✅ CORRECTION PRINCIPALE : Création de manifeste avec accès sécurisé aux propriétés
async function creerManifeste(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('btn-submit');
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerHTML;
    
    // Disable button et show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div> Transmission en cours...';
    
    // ✅ Collecte sécurisée des données du formulaire
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    const manifeste = {
        numeroManifeste: getElementValue('numeroManifeste'),
        transporteur: getElementValue('transporteur'),
        navire: getElementValue('navire'),
        portEmbarquement: getElementValue('portEmbarquement'),
        portDebarquement: getElementValue('portDebarquement'),
        dateArrivee: getElementValue('dateArrivee'),
        marchandises: [{
            codeSH: getElementValue('codeSH'),
            designation: getElementValue('designation'),
            poidsBrut: parseFloat(getElementValue('poidsBrut')) || 0,
            nombreColis: parseInt(getElementValue('nombreColis')) || 1,
            destinataire: getElementValue('destinataire'),
            paysDestination: getElementValue('paysDestination')
        }]
    };
    
    console.log('📋 Création manifeste:', manifeste.numeroManifeste);
    ajouterInteraction('📋 Création manifeste', `${manifeste.numeroManifeste} vers ${manifeste.marchandises[0]?.paysDestination || 'DEST'}`);
    
    try {
        const response = await fetch(`${API_BASE}/manifeste/creer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(manifeste),
            signal: AbortSignal.timeout(60000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📋 Résultat création:', result.status, result.message);
        
        // ✅ CORRECTION : Accès sécurisé à toutes les propriétés
        if (result.status === 'SUCCESS') {
            afficherNotification('✅ Manifeste créé et transmis au Kit avec succès!', 'success');
            
            // ✅ Gestion ultra-sécurisée de la latence
            const latence = result.transmission?.latence || 
                          result.transmissionKit?.succes?.latence || 
                          result.transmission?.duree || 'N/A';
            const manifesteId = result.manifeste?.id || 
                              result.manifeste?.numeroManifeste || 'ID inconnu';
            
            ajouterInteraction('🚀 Transmission Kit', 
                `✅ Succès - ${manifesteId} (${latence}ms)`);
            
            // Reset form
            resetForm();
            
        } else if (result.status === 'PARTIAL_SUCCESS') {
            afficherNotification('⚠️ Manifeste créé localement mais erreur transmission Kit', 'warning');
            
            // ✅ Gestion ultra-sécurisée des erreurs
            const erreur = result.transmission?.erreur || 
                          result.transmissionKit?.echec?.erreur || 
                          result.erreur || 'Erreur inconnue';
            
            ajouterInteraction('🚀 Transmission Kit', `⚠️ Partiel - ${erreur}`);
        } else {
            throw new Error(result.message || 'Erreur inconnue');
        }
        
        // ✅ Actualisation forcée
        console.log('🔄 Actualisation forcée des statistiques...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await chargerStatistiques();
        await chargerManifestes();
        
        console.log('✅ Actualisation terminée');
        
    } catch (error) {
        console.error('❌ Erreur création manifeste:', error);
        afficherNotification('❌ Erreur: ' + error.message, 'error');
        ajouterInteraction('📋 Création manifeste', `❌ Erreur: ${error.message}`);
    } finally {
        // ✅ Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ✅ Fonction helper pour reset form
function resetForm() {
    const form = document.getElementById('manifeste-form');
    if (form) {
        form.reset();
        const dateElement = document.getElementById('dateArrivee');
        if (dateElement) {
            dateElement.value = new Date().toISOString().split('T')[0];
        }
    }
}

// ✅ CORRECTION : Chargement statistiques sécurisé
async function chargerStatistiques() {
    try {
        console.log('📊 Chargement statistiques...');
        
        const response = await fetch(`${API_BASE}/statistiques`, {
            signal: AbortSignal.timeout(8000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Réponse statistiques:', data.status, data.statistiques);
        
        // ✅ CORRECTION : Traiter tous les statuts avec accès sécurisé
        if (data.statistiques && ['SUCCESS', 'PARTIAL', 'DEGRADED'].includes(data.status)) {
            const stats = data.statistiques;
            
            // ✅ Fonction helper sécurisée
            const updateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || '0';
                    element.style.color = ''; // Reset color
                }
            };
            
            updateElement('stat-manifestes', stats.manifestesCreees);
            updateElement('stat-transmissions', stats.transmissionsKit);
            updateElement('stat-succes', stats.transmissionsReussies);
            updateElement('taux-reussite', (stats.tauxReussiteTransmission || 100) + '%');
            
            // ✅ CORRECTION CRITIQUE : Gestion ultra-sécurisée de la latence moyenne
            const latenceMoyenne = (stats.performance?.latenceMoyenne || 0);
            updateElement('latence-moyenne', latenceMoyenne > 0 ? latenceMoyenne + ' ms' : '-- ms');
            
            console.log('✅ Statistiques mises à jour:', {
                manifestes: stats.manifestesCreees,
                transmissions: stats.transmissionsKit,
                succes: stats.transmissionsReussies,
                taux: stats.tauxReussiteTransmission
            });
            
            // ✅ Mettre à jour le statut Kit
            if (data.kit) {
                kitConnected = data.kit.accessible || false;
            }
            
        } else {
            console.warn('⚠️ Statistiques non disponibles, statut:', data.status);
            if (data.erreur) {
                console.error('Erreur serveur:', data.erreur);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement statistiques:', error);
        
        // ✅ Afficher indicateur d'erreur
        const elements = ['stat-manifestes', 'stat-transmissions', 'stat-succes'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.textContent === '0') {
                element.textContent = '--';
                element.style.color = '#ffc107';
            }
        });
    }
}

// ✅ Chargement manifestes sécurisé
async function chargerManifestes() {
    try {
        const response = await fetch(`${API_BASE}/manifeste/lister?limite=5`, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const container = document.getElementById('manifestes-list');
        
        if (!container) return;
        
        if (data.status === 'SUCCESS' && data.manifestes && data.manifestes.length > 0) {
            container.innerHTML = data.manifestes.map(manifeste => {
                const transmission = manifeste.transmission || {};
                const transmissionClass = transmission.reussie ? 'transmitted' : 
                                         transmission.statut === 'ERREUR' ? 'error' : '';
                
                const statusBadge = transmission.reussie ? 
                    '<span class="transmission-status success">✅ Transmis Kit</span>' :
                    transmission.statut === 'ERREUR' ? 
                    '<span class="transmission-status error">❌ Erreur Kit</span>' :
                    '<span class="transmission-status pending">⏳ En attente</span>';
                
                return `
                    <div class="manifeste-item ${transmissionClass}">
                        <div class="manifeste-header">
                            ${manifeste.numeroManifeste || 'N/A'} - ${manifeste.transporteur || 'N/A'}
                        </div>
                        <div class="manifeste-details">
                            📍 ${manifeste.ports?.embarquement || 'N/A'} → ${manifeste.ports?.debarquement || 'N/A'}<br>
                            📦 ${manifeste.marchandises?.nombre || 0} marchandise(s) → ${(manifeste.marchandises?.paysDestinations || []).join(', ')}<br>
                            📅 ${manifeste.dateCreation ? new Date(manifeste.dateCreation).toLocaleString('fr-FR') : 'N/A'}<br>
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

// Test de connexion Kit
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test connexion Kit', 'Test de connectivité...');
    afficherNotification('🔧 Test Kit en cours...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/health`, {
            signal: AbortSignal.timeout(10000)
        });
        
        const data = await response.json();
        
        if (data.kit && data.kit.accessible) {
            const latence = data.kit.latence || 'N/A';
            afficherNotification(`✅ Kit accessible (${latence}ms)`, 'success');
            ajouterInteraction('🔧 Test Kit', `✅ Succès - Latence: ${latence}ms`);
            return true;
        } else {
            throw new Error(data.kit?.erreur || 'Kit inaccessible');
        }
        
    } catch (error) {
        console.error('❌ Test Kit échoué:', error);
        afficherNotification('❌ Kit inaccessible: ' + error.message, 'error');
        ajouterInteraction('🔧 Test Kit', `❌ Échec: ${error.message}`);
        return false;
    }
}

// Diagnostic complet
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Démarrage diagnostic...');
    afficherNotification('🩺 Diagnostic en cours...', 'info');
    
    const resultats = {
        serviceLocal: false,
        kitMulesoft: false,
        baseDonnees: false
    };
    
    try {
        // Test service local
        const healthResponse = await fetch(`${API_BASE}/health`, {
            signal: AbortSignal.timeout(5000)
        });
        resultats.serviceLocal = healthResponse.ok;
        
        // Test base de données via statistiques
        const statsResponse = await fetch(`${API_BASE}/statistiques`, {
            signal: AbortSignal.timeout(5000)
        });
        const statsData = await statsResponse.json();
        resultats.baseDonnees = !!statsData.statistiques;
        
        // Test Kit MuleSoft
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            resultats.kitMulesoft = healthData.kit?.accessible || false;
        }
        
        const testsReussis = Object.values(resultats).filter(Boolean).length;
        const totalTests = Object.keys(resultats).length;
        
        const message = `Terminé - ${testsReussis}/${totalTests} composants opérationnels`;
        ajouterInteraction('🩺 Diagnostic', message);
        
        if (testsReussis >= 2) {
            afficherNotification(`✅ Système fonctionnel - ${message}`, 'success');
        } else {
            afficherNotification(`⚠️ Problèmes détectés - ${message}`, 'warning');
        }
        
    } catch (error) {
        ajouterInteraction('🩺 Diagnostic', `❌ Erreur - ${error.message}`);
        afficherNotification('❌ Diagnostic échoué', 'error');
    }
}

// Charger toutes les données
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

// ✅ CORRECTION : Ajouter interaction ultra-sécurisé
function ajouterInteraction(title, details) {
    const container = document.getElementById('kit-interactions');
    if (!container) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    // ✅ Nettoyage sécurisé des paramètres
    const safeTitle = (title || 'Action').toString();
    const safeDetails = (details || 'Détails non disponibles').toString();
    
    const item = document.createElement('div');
    item.className = 'interaction-item';
    
    // Déterminer la classe selon le contenu
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
            items[i].remove();
        }
    }
}

// Notification sécurisée
function afficherNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message || 'Notification';
    notification.className = `notification ${type || 'info'}`;
    notification.classList.add('show');
    
    const duration = type === 'error' ? 7000 : type === 'warning' ? 5000 : 3000;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Fonctions publiques pour les boutons HTML
window.chargerStatistiques = chargerStatistiques;
window.chargerManifestes = chargerManifestes;
window.testerConnexionKit = testerConnexionKit;
window.lancerDiagnostic = lancerDiagnostic;
window.chargerDonnees = chargerDonnees;

// Cleanup
window.addEventListener('beforeunload', () => {
    if (statusInterval) clearInterval(statusInterval);
    if (refreshInterval) clearInterval(refreshInterval);
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
    ajouterInteraction('⚠️ Erreur système', event.error?.message || 'Erreur inconnue');
});

console.log('✅ Script Pays A COMPLET initialisé - Toutes erreurs latence corrigées');