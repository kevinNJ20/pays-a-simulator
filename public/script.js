// Configuration API
const API_BASE = window.location.origin + '/api';
let statusInterval;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Simulateur Pays A');
    
    // Définir la date par défaut
    document.getElementById('dateArrivee').value = new Date().toISOString().split('T')[0];
    
    // Vérifier le statut périodiquement
    verifierStatut();
    statusInterval = setInterval(verifierStatut, 30000);
    
    // Charger les données initiales
    chargerStatistiques();
    chargerManifestes();
    chargerAutorisations();
    
    // Gérer le formulaire
    document.getElementById('manifeste-form').addEventListener('submit', creerManifeste);
});

// Vérification du statut du service
async function verifierStatut() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        
        if (data.status === 'UP') {
            indicator.textContent = '🟢';
            text.textContent = 'Service actif';
        } else {
            indicator.textContent = '🔴';
            text.textContent = 'Service indisponible';
        }
    } catch (error) {
        document.getElementById('status-indicator').textContent = '🔴';
        document.getElementById('status-text').textContent = 'Erreur connexion';
    }
}

// Création d'un manifeste
async function creerManifeste(event) {
    event.preventDefault();
    
    const manifeste = {
        numeroManifeste: document.getElementById('numeroManifeste').value,
        transporteur: document.getElementById('transporteur').value,
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
    
    try {
        const response = await fetch(`${API_BASE}/manifeste/enregistrer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(manifeste)
        });
        
        const result = await response.json();
        
        if (result.status === 'SUCCESS') {
            afficherNotification('✅ Manifeste créé et transmis avec succès!', 'success');
            document.getElementById('manifeste-form').reset();
            
            // Actualiser les données
            setTimeout(() => {
                chargerStatistiques();
                chargerManifestes();
            }, 1000);
        } else {
            afficherNotification('❌ Erreur: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Erreur création manifeste:', error);
        afficherNotification('❌ Erreur de connexion', 'error');
    }
}

// Chargement des statistiques
async function chargerStatistiques() {
    try {
        const response = await fetch(`${API_BASE}/statistiques`);
        const data = await response.json();
        
        document.getElementById('stat-manifestes').textContent = data.statistiques.manifestesTraites;
        document.getElementById('stat-autorisations').textContent = data.statistiques.autorisationsRecues;
        
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
    }
}

// Chargement des manifestes
async function chargerManifestes() {
    try {
        const response = await fetch(`${API_BASE}/manifeste/enregistrer`);
        const data = await response.json();
        
        const container = document.getElementById('manifestes-list');
        
        if (data.manifestes && data.manifestes.length > 0) {
            container.innerHTML = data.manifestes
                .slice(-5)
                .reverse()
                .map(manifeste => `
                    <div class="manifeste-item">
                        <div class="manifeste-header">
                            ${manifeste.id} - ${manifeste.transporteur}
                        </div>
                        <div class="manifeste-details">
                            📍 ${manifeste.portEmbarquement} → ${manifeste.portDebarquement}<br>
                            📦 ${manifeste.marchandises?.length || 0} marchandises → ${manifeste.marchandises?.[0]?.paysDestination}<br>
                            🏷️ Statut: ${manifeste.statut}<br>
                            📅 ${new Date(manifeste.dateCreation).toLocaleString('fr-FR')}
                        </div>
                    </div>
                `).join('');
        } else {
            container.innerHTML = '<p>Aucun manifeste trouvé</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement manifestes:', error);
    }
}

// Chargement des autorisations
async function chargerAutorisations() {
    try {
        const response = await fetch(`${API_BASE}/mainlevee/autorisation`);
        const data = await response.json();
        
        const container = document.getElementById('autorisations-list');
        
        if (data.autorisations && data.autorisations.length > 0) {
            container.innerHTML = data.autorisations
                .slice(-5)
                .reverse()
                .map(auth => `
                    <div class="autorisation-item">
                        <div class="manifeste-header">
                            🔓 ${auth.referenceAutorisation || auth.id}
                        </div>
                        <div class="manifeste-details">
                            📋 Manifeste: ${auth.numeroManifeste}<br>
                            💰 Montant: ${auth.montantAcquitte?.toLocaleString('fr-FR')} FCFA<br>
                            🏷️ Statut: ${auth.statut}<br>
                            📅 ${new Date(auth.dateReception).toLocaleString('fr-FR')}
                        </div>
                    </div>
                `).join('');
        } else {
            container.innerHTML = '<p>Aucune autorisation reçue</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement autorisations:', error);
    }
}

// Affichage des notifications
function afficherNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Nettoyage à la fermeture
window.addEventListener('beforeunload', () => {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
});