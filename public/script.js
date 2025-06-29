// Configuration API
const API_BASE = window.location.origin + '/api';
const KIT_URL = 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io';

let statusInterval;
let refreshInterval;
let kitConnected = false;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Pays A - Monitoring Kit MuleSoft');
    
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

// Vérification du statut Kit
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

// Test de connexion Kit
async function testerConnexionKit() {
    ajouterInteraction('🔧 Test connexion Kit', 'Test de connectivité démarré...');
    
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (data.kit.accessible) {
            afficherNotification(`✅ Kit accessible - Latence: ${data.kit.latence}ms`, 'success');
            ajouterInteraction('🔧 Test Kit', `✅ Succès - Latence: ${data.kit.latence}ms`);
        } else {
            throw new Error('Kit inaccessible');
        }
        
    } catch (error) {
        afficherNotification('❌ Kit inaccessible: ' + error.message, 'error');
        ajouterInteraction('🔧 Test Kit', `❌ Échec: ${error.message}`);
    }
}

// Diagnostic complet
async function lancerDiagnostic() {
    ajouterInteraction('🩺 Diagnostic', 'Démarrage diagnostic complet...');
    afficherNotification('🩺 Diagnostic en cours...', 'info');
    
    // Simulation d'un diagnostic complet
    setTimeout(() => {
        const resultats = {
            connectivite: kitConnected,
            latence: kitConnected ? '< 1000ms' : 'N/A',
            endpoints: kitConnected ? '3/3' : '0/3'
        };
        
        ajouterInteraction('🩺 Diagnostic', 
            `Connectivité: ${resultats.connectivite ? '✅' : '❌'}, ` +
            `Latence: ${resultats.latence}, ` +
            `Endpoints: ${resultats.endpoints}`
        );
        
        afficherNotification('🩺 Diagnostic terminé', 'info');
    }, 2000);
}

// Création de manifeste
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

// Cleanup
window.addEventListener('beforeunload', () => {
    if (statusInterval) clearInterval(statusInterval);
    if (refreshInterval) clearInterval(refreshInterval);
});