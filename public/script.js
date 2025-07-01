// ============================================================================
// PAYS A - Script Frontend CORRIGÉ - Erreurs latence et accès sécurisé FIXÉES
// Fichier: public/script.js - VERSION FINALE SANS ERREURS
// ============================================================================

// Configuration API - PAYS A CORRIGÉ
const API_BASE = window.location.origin + '/api';
const KIT_MULESOFT_URL = 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io/api/v1';
window.SYSTEME_TYPE = 'PAYS_A';
window.PAYS_CODE = 'CIV';

let statusInterval;
let refreshInterval;
let kitConnected = false;

// ✅ Fonction helper pour accès sécurisé aux propriétés
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

// ✅ Fonction helper pour mettre à jour des éléments DOM de manière sécurisée
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

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Initialisation Pays A - Version erreurs corrigées définitive');
  
  try {
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
    
    ajouterInteraction('🏗️ Service démarré', 'Pays A opérationnel - Version finale corrigée');
    
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    ajouterInteraction('⚠️ Initialisation', `Erreur partielle: ${error.message}`);
  }
});

// Vérification du statut Kit
async function verifierStatutKit() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000)
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
    console.error('Erreur vérification Kit:', error);
    const banner = document.getElementById('kit-banner');
    if (banner) {
      banner.className = 'kit-status-banner disconnected';
      banner.innerHTML = `⚠️ Impossible de vérifier le Kit - Service local actif`;
    }
    kitConnected = false;
  }
}

// ✅ CORRECTION PRINCIPALE : Création de manifeste avec accès ultra-sécurisé
async function creerManifeste(event) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('btn-submit');
  if (!submitBtn) return;
  
  const originalText = submitBtn.innerHTML;
  
  // Disable button et show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="loading"></div> Transmission en cours...';
  
  try {
    // ✅ Collecte ultra-sécurisée des données du formulaire
    const getElementValue = (id, defaultValue = '') => {
      try {
        const element = document.getElementById(id);
        return element && element.value ? element.value.trim() : defaultValue;
      } catch (error) {
        console.warn(`Erreur lecture champ ${id}:`, error);
        return defaultValue;
      }
    };
    
    const manifeste = {
      numeroManifeste: getElementValue('numeroManifeste'),
      transporteur: getElementValue('transporteur'),
      navire: getElementValue('navire'),
      portEmbarquement: getElementValue('portEmbarquement', 'ROTTERDAM'),
      portDebarquement: getElementValue('portDebarquement', 'ABIDJAN'),
      dateArrivee: getElementValue('dateArrivee'),
      marchandises: [{
        codeSH: getElementValue('codeSH', '8703.21.10'),
        designation: getElementValue('designation'),
        poidsBrut: parseFloat(getElementValue('poidsBrut', '0')) || 0,
        nombreColis: parseInt(getElementValue('nombreColis', '1')) || 1,
        destinataire: getElementValue('destinataire'),
        paysDestination: getElementValue('paysDestination')
      }]
    };
    
    // Validation basique côté client
    if (!manifeste.numeroManifeste || !manifeste.transporteur || !manifeste.dateArrivee) {
      throw new Error('Veuillez remplir tous les champs obligatoires');
    }
    
    if (!manifeste.marchandises[0].designation || !manifeste.marchandises[0].paysDestination) {
      throw new Error('Veuillez remplir les informations de marchandise');
    }
    
    console.log('📋 Création manifeste:', manifeste.numeroManifeste);
    ajouterInteraction('📋 Création manifeste', 
      `${manifeste.numeroManifeste} vers ${safeGet(manifeste, 'marchandises.0.paysDestination', 'DEST')}`);
    
    // ✅ Appel API avec timeout et gestion d'erreur
    const response = await fetch(`${API_BASE}/manifeste/creer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source-Country': 'CIV',
        'X-Source-System': 'PAYS_A_FRONTEND'
      },
      body: JSON.stringify(manifeste),
      signal: AbortSignal.timeout(60000)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch (e) {
        // Ignore, use default error message
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📋 Résultat création:', safeGet(result, 'status', 'UNKNOWN'), safeGet(result, 'message', 'No message'));
    
    // ✅ CORRECTION ULTRA-CRITIQUE : Accès ultra-sécurisé à toutes les propriétés
    const resultStatus = safeGet(result, 'status', 'UNKNOWN');
    
    if (resultStatus === 'SUCCESS') {
      afficherNotification('✅ Manifeste créé et transmis au Kit avec succès!', 'success');
      
      // ✅ Gestion ultra-sécurisée de la latence et autres propriétés
      const latence = safeGet(result, 'transmissionKit.succes.latence', null) ||
                    safeGet(result, 'transmission.latence', null) ||
                    safeGet(result, 'transmissionKit.latence', null) ||
                    safeGet(result, 'metadata.duration', null) ||
                    'N/A';
      
      const manifesteId = safeGet(result, 'manifeste.id', null) ||
                         safeGet(result, 'manifeste.numeroManifeste', null) ||
                         manifeste.numeroManifeste ||
                         'ID inconnu';
      
      ajouterInteraction('🚀 Transmission Kit', 
        `✅ Succès - ${manifesteId} (${latence}ms)`);
      
      // Reset form
      resetForm();
      
    } else if (resultStatus === 'PARTIAL_SUCCESS') {
      afficherNotification('⚠️ Manifeste créé localement mais erreur transmission Kit', 'warning');
      
      // ✅ Gestion ultra-sécurisée des erreurs
      const erreur = safeGet(result, 'transmissionKit.echec.erreur', null) ||
                    safeGet(result, 'transmission.erreur', null) ||
                    safeGet(result, 'erreur', null) ||
                    'Erreur de transmission inconnue';
      
      ajouterInteraction('🚀 Transmission Kit', `⚠️ Partiel - ${erreur}`);
    } else {
      const errorMessage = safeGet(result, 'message', 'Erreur inconnue du serveur');
      throw new Error(errorMessage);
    }
    
    // ✅ Actualisation forcée avec gestion d'erreur
    console.log('🔄 Actualisation forcée des statistiques...');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await Promise.allSettled([
        chargerStatistiques().catch(err => console.warn('Erreur stats:', err)),
        chargerManifestes().catch(err => console.warn('Erreur manifestes:', err))
      ]);
      console.log('✅ Actualisation terminée');
    } catch (refreshError) {
      console.warn('Erreur actualisation:', refreshError);
    }
    
  } catch (error) {
    console.error('❌ Erreur création manifeste:', error);
    const errorMessage = error.message || 'Erreur inconnue';
    afficherNotification('❌ Erreur: ' + errorMessage, 'error');
    ajouterInteraction('📋 Création manifeste', `❌ Erreur: ${errorMessage}`);
  } finally {
    // ✅ Restore button toujours, même en cas d'erreur
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

// ✅ Fonction helper pour reset form sécurisé
function resetForm() {
  try {
    const form = document.getElementById('manifeste-form');
    if (form) {
      form.reset();
      const dateElement = document.getElementById('dateArrivee');
      if (dateElement) {
        dateElement.value = new Date().toISOString().split('T')[0];
      }
      console.log('✅ Formulaire réinitialisé');
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
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Réponse statistiques:', safeGet(data, 'status', 'UNKNOWN'));
    
    // ✅ CORRECTION : Traiter tous les statuts avec accès ultra-sécurisé
    const dataStatus = safeGet(data, 'status', 'ERROR');
    const stats = safeGet(data, 'statistiques', {});
    
    if (stats && ['SUCCESS', 'PARTIAL', 'DEGRADED'].includes(dataStatus)) {
      // ✅ Mise à jour ultra-sécurisée des éléments
      updateElement('stat-manifestes', safeGet(stats, 'manifestesCreees', 0));
      updateElement('stat-transmissions', safeGet(stats, 'transmissionsKit', 0));
      updateElement('stat-succes', safeGet(stats, 'transmissionsReussies', 0));
      updateElement('taux-reussite', (safeGet(stats, 'tauxReussiteTransmission', 100)) + '%');
      
      // ✅ CORRECTION CRITIQUE : Gestion ultra-sécurisée de la latence moyenne
      const latenceMoyenne = safeGet(stats, 'performance.latenceMoyenne', 0) ||
                            safeGet(stats, 'latenceMoyenne', 0) ||
                            0;
      updateElement('latence-moyenne', latenceMoyenne > 0 ? latenceMoyenne + ' ms' : '-- ms');
      
      console.log('✅ Statistiques mises à jour:', {
        manifestes: safeGet(stats, 'manifestesCreees', 0),
        transmissions: safeGet(stats, 'transmissionsKit', 0),
        succes: safeGet(stats, 'transmissionsReussies', 0),
        taux: safeGet(stats, 'tauxReussiteTransmission', 100)
      });
      
      // ✅ Mettre à jour le statut Kit de manière sécurisée
      const kitData = safeGet(data, 'kit', {});
      if (kitData) {
        kitConnected = safeGet(kitData, 'accessible', false);
      }
      
    } else {
      console.warn('⚠️ Statistiques non disponibles, statut:', dataStatus);
      const erreur = safeGet(data, 'erreur', 'Erreur inconnue');
      if (erreur !== 'Erreur inconnue') {
        console.error('Erreur serveur:', erreur);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur chargement statistiques:', error);
    
    // ✅ Afficher indicateur d'erreur de manière sécurisée
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
      signal: AbortSignal.timeout(5000)
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
        // ✅ Accès ultra-sécurisé à toutes les propriétés
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
        
        const numeroManifeste = safeGet(manifeste, 'numeroManifeste', 'N/A');
        const transporteur = safeGet(manifeste, 'transporteur', 'N/A');
        const embarquement = safeGet(manifeste, 'ports.embarquement', 'N/A');
        const debarquement = safeGet(manifeste, 'ports.debarquement', 'N/A');
        const nombreMarchandises = safeGet(manifeste, 'marchandises.nombre', 0);
        const paysDestinations = safeGet(manifeste, 'marchandises.paysDestinations', []);
        const dateCreation = safeGet(manifeste, 'dateCreation', null);
        
        return `
          <div class="manifeste-item ${transmissionClass}">
            <div class="manifeste-header">
              ${numeroManifeste} - ${transporteur}
            </div>
            <div class="manifeste-details">
              📍 ${embarquement} → ${debarquement}<br>
              📦 ${nombreMarchandises} marchandise(s) → ${Array.isArray(paysDestinations) ? paysDestinations.join(', ') : 'N/A'}<br>
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

// Test de connexion Kit ultra-sécurisé
async function testerConnexionKit() {
  ajouterInteraction('🔧 Test connexion Kit', 'Test de connectivité...');
  afficherNotification('🔧 Test Kit en cours...', 'info');
  
  try {
    const response = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const kitInfo = safeGet(data, 'kit', {});
    const accessible = safeGet(kitInfo, 'accessible', false);
    const latence = safeGet(kitInfo, 'latence', 'N/A');
    const erreur = safeGet(kitInfo, 'erreur', null);
    
    if (accessible) {
      afficherNotification(`✅ Kit accessible (${latence}ms)`, 'success');
      ajouterInteraction('🔧 Test Kit', `✅ Succès - Latence: ${latence}ms`);
      return true;
    } else {
      throw new Error(erreur || 'Kit inaccessible - statut non accessible');
    }
    
  } catch (error) {
    console.error('❌ Test Kit échoué:', error);
    const errorMessage = error.message || 'Erreur inconnue';
    afficherNotification('❌ Kit inaccessible: ' + errorMessage, 'error');
    ajouterInteraction('🔧 Test Kit', `❌ Échec: ${errorMessage}`);
    return false;
  }
}

// Diagnostic complet ultra-sécurisé
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
    try {
      const healthResponse = await fetch(`${API_BASE}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      resultats.serviceLocal = healthResponse.ok;
      
      // Test Kit MuleSoft
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        const kitInfo = safeGet(healthData, 'kit', {});
        resultats.kitMulesoft = safeGet(kitInfo, 'accessible', false);
      }
    } catch (healthError) {
      console.warn('Erreur test santé:', healthError);
    }
    
    // Test base de données via statistiques
    try {
      const statsResponse = await fetch(`${API_BASE}/statistiques`, {
        signal: AbortSignal.timeout(5000)
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        resultats.baseDonnees = !!safeGet(statsData, 'statistiques', null);
      }
    } catch (statsError) {
      console.warn('Erreur test base de données:', statsError);
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
    const errorMessage = error.message || 'Erreur inconnue';
    ajouterInteraction('🩺 Diagnostic', `❌ Erreur - ${errorMessage}`);
    afficherNotification('❌ Diagnostic échoué', 'error');
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

// ✅ CORRECTION : Ajouter interaction ultra-sécurisé
function ajouterInteraction(title, details) {
  try {
    const container = document.getElementById('kit-interactions');
    if (!container) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    // ✅ Nettoyage ultra-sécurisé des paramètres
    const safeTitle = (title || 'Action').toString().substring(0, 100);
    const safeDetails = (details || 'Détails non disponibles').toString().substring(0, 200);
    
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

console.log('✅ Script Pays A ULTRA-SÉCURISÉ initialisé - Toutes erreurs corrigées définitivement');