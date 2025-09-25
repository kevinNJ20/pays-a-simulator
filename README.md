# 🇸🇳 Simulateur Système Douanier Sénégal - Port de Dakar

**Pays de Prime Abord** - Implémentation conforme au rapport PDF UEMOA  
Simulation complète des workflows Libre Pratique (21 étapes) et Transit (16 étapes)

---

## 📋 **Vue d'ensemble**

Ce simulateur implémente le système douanier du **Sénégal (Pays A)** selon l'architecture d'interconnexion UEMOA définie dans le rapport PDF. En tant que **pays de prime abord**, le Sénégal gère l'arrivée des marchandises au **Port de Dakar** et assure leur traitement selon les workflows réglementaires.

### 🎯 **Rôle dans l'écosystème UEMOA**

- **Pays A** : Sénégal (Dakar) - Pays de prime abord côtier
- **Port principal** : Port de Dakar
- **Fonction** : Point d'entrée des marchandises dans l'espace UEMOA
- **Interconnexion** : Sénégal ↔ Kit MuleSoft ↔ Mali (Pays B) ↔ Commission UEMOA

---

## 🚀 **Démarrage rapide**

### **1. Lancement local**

```bash
# Option 1: Script npm (recommandé)
npm start

# Option 2: Node.js direct
node server.js

# Option 3: Script de démarrage
node start-local.js
```

### **2. Avec Vercel (déploiement)**

```bash
# Si Vercel CLI installée
vercel dev

# Sinon, mode local
npm start
```

### **3. URLs disponibles**

- **🖥️ Interface web** : http://localhost:3001
- **🏥 Health check** : http://localhost:3001/api/health
- **📊 Statistiques** : http://localhost:3001/api/statistiques
- **📋 Manifestes** : http://localhost:3001/api/manifeste/lister

---

## 🔥 **Workflows implémentés**

### **📦 Workflow Libre Pratique (21 étapes)**

Le simulateur Sénégal implémente les **étapes 1-5, 17-19** du workflow libre pratique :

#### **ÉTAPES 1-5 : Création et transmission manifeste**
- ✅ **ÉTAPE 1** : Téléchargement manifeste d'entrée par consignataire
- ✅ **ÉTAPE 2** : Renseignement informations marchandise 
- ✅ **ÉTAPE 3** : Enregistrement informations dans la base locale
- ✅ **ÉTAPE 4** : Transmission automatique vers Kit MuleSoft
- ✅ **ÉTAPE 5** : Extraction transmise vers pays de destination

#### **ÉTAPE 17 : Réception informations déclaration**
- ✅ **ÉTAPE 17** : Réception informations déclaration/recouvrement depuis Kit MuleSoft

#### **ÉTAPES 18-19 : Apurement et levée**
- ✅ **ÉTAPE 18** : Apurement du manifeste au Port de Dakar
- ✅ **ÉTAPE 19** : Attribution main levée (bon à enlever)

### **🚛 Workflow Transit (16 étapes)**

- ✅ **ÉTAPES 1-6** : Création déclaration transit au départ
- ✅ **ÉTAPE 14** : Réception message arrivée destination
- ✅ **ÉTAPES 15-16** : Apurement transit au Sénégal

---

## 🛠️ **Architecture technique**

### **📁 Structure du projet**

```
simulateur-senegal/
├── api/                          # APIs REST du simulateur
│   ├── health.js                # Health check système
│   ├── statistiques.js          # Métriques et performance
│   ├── manifeste/
│   │   ├── creer.js             # ÉTAPES 1-5: Création manifeste
│   │   └── lister.js            # Liste des manifestes
│   ├── mainlevee/
│   │   └── autorisation.js      # ÉTAPE 17: Réception autorisation
│   ├── apurement/
│   │   └── traiter.js           # ÉTAPES 18-19: Apurement/Levée
│   └── kit/
│       └── test.js              # Tests Kit MuleSoft
├── lib/                          # Librairies métier
│   ├── database.js              # Base de données embarquée
│   └── kit-client.js            # Client Kit MuleSoft
├── public/                       # Interface web
│   ├── index.html               # Dashboard interactif
│   ├── script.js                # JavaScript frontend
│   └── style.css                # Styles CSS
├── server.js                     # Serveur HTTP principal
├── package.json                  # Configuration npm
└── README.md                     # Documentation
```

### **⚙️ Configuration technique**

- **Runtime** : Node.js 22.x
- **Port** : 3001 (configurable via PORT)
- **Format** : UEMOA 2025.1 natif
- **Base de données** : Embarquée (lib/database.js)
- **Kit MuleSoft** : http://localhost:8080/api/v1

---

## 📊 **APIs et Services**

### **🏥 Health Check** - `/api/health`

**Méthode** : `GET`  
**Fonction** : Vérification état système et connectivité Kit MuleSoft

```json
{
  "service": "Système Douanier Sénégal (Port de Dakar)",
  "status": "UP",
  "pays": {
    "code": "SEN",
    "nom": "Sénégal",
    "role": "PAYS_PRIME_ABORD"
  },
  "kit": {
    "accessible": true,
    "latence": 150
  }
}
```

### **📦 Création Manifeste** - `/api/manifeste/creer`

**Méthode** : `POST`  
**Fonction** : ÉTAPES 1-5 du workflow libre pratique

**Headers requis** :
```http
Content-Type: application/json
X-Source-Country: SEN
X-Source-System: SENEGAL_DOUANES_FRONTEND
```

**Payload UEMOA** :
```json
{
  "annee_manif": "2025",
  "bureau_manif": "18N",
  "numero_manif": 5016,
  "consignataire": "MAERSK LINE SENEGAL",
  "navire": "MARCO POLO",
  "provenance": "ROTTERDAM",
  "date_arrivee": "2025-01-15",
  "nbre_article": 1,
  "articles": [
    {
      "art": 1,
      "pays_dest": "MALI",
      "ville_dest": "BAMAKO",
      "marchandise": "Véhicule particulier Toyota",
      "poids": 1500,
      "destinataire": "IMPORT SARL BAMAKO",
      "connaissement": "233698813"
    }
  ]
}
```

**Traitement automatique** :
1. **Validation** format UEMOA Sénégal
2. **Stockage** dans base locale Port de Dakar  
3. **Transmission** extraction vers Kit MuleSoft
4. **Routage** vers Mali (Bamako) via Kit
5. **Notification** Commission UEMOA

### **🔓 Autorisation Mainlevée** - `/api/mainlevee/autorisation`

**Méthode** : `POST`  
**Fonction** : ÉTAPE 17 - Réception informations déclaration/recouvrement

**Headers spéciaux** :
```http
X-Correlation-ID: MLI_SEN_2025_001
X-Authorization-Source: KIT_MULESOFT
X-Source-Country: MLI
X-Payment-Reference: PAY-MLI-2025-001
```

**Payload** :
```json
{
  "autorisationMainlevee": {
    "numeroManifeste": "5016",
    "referenceDeclaration": "DEC-MLI-2025-001",
    "montantAcquitte": 250000,
    "paysDeclarant": "MLI",
    "referencePaiement": "PAY-MLI-2025-001",
    "datePaiement": "2025-01-15T14:30:00Z"
  }
}
```

**Traitement** :
1. **Vérification** manifeste au Port de Dakar
2. **Enregistrement** informations Mali
3. **Mise à jour** statut → `DECLARATION_RECUE`
4. **Préparation** pour apurement

### **✅ Apurement et Levée** - `/api/apurement/traiter`

**Méthodes** : `GET` / `POST`  
**Fonction** : ÉTAPES 18-19 - Apurement manifeste et attribution main levée

#### **GET** - Récupération infos apurement
```http
GET /api/apurement/traiter?numeroManifeste=5016&referencePaiement=PAY-MLI-2025-001
```

#### **POST** - Confirmation apurement
```json
{
  "numeroManifeste": "5016",
  "referencePaiement": "PAY-MLI-2025-001",
  "typeConfirmation": "DOUANE",
  "agentConfirmation": "AGENT_DOUANES_DAKAR",
  "observations": "Apurement conforme règlement UEMOA"
}
```

**Traitement ÉTAPE 18-19** :
1. **ÉTAPE 18** : Apurement confirme par agent douanes
2. **ÉTAPE 19** : Attribution bon à enlever (BAE)
3. **Notification** Kit MuleSoft de l'apurement
4. **Finalisation** workflow Sénégal

### **📋 Liste Manifestes** - `/api/manifeste/lister`

**Méthode** : `GET`  
**Paramètres** :
- `limite` : Nombre manifestes (défaut: 20)
- `statut` : Filtre par statut
- `paysDestination` : Filtre par pays
- `etapeWorkflow` : Filtre par étape

**Statuts possibles** :
- `MANIFESTE_CREE` : Étapes 1-3 terminées
- `TRANSMIS_VERS_DESTINATION` : Étapes 4-5 terminées  
- `DECLARATION_RECUE` : Étape 17 terminée
- `APURE` : Étape 18 terminée
- `MAINLEVEE_ATTRIBUEE` : Étape 19 terminée

### **📊 Statistiques** - `/api/statistiques`

**Méthode** : `GET`  
**Fonction** : Métriques système et workflow

```json
{
  "status": "SUCCESS",
  "paysTraitement": {
    "code": "SEN",
    "nom": "Sénégal",
    "role": "PAYS_PRIME_ABORD"
  },
  "statistiques": {
    "manifestesCreees": 15,
    "transmissionsKit": 12,
    "transmissionsReussies": 10,
    "apurementsTraites": 5
  },
  "workflowLibrePratique": {
    "etapesSenegal": "1-5, 17-19",
    "etapesCompletes": {
      "etapes_1_3_creation": 15,
      "etape_4_5_transmission": 12,
      "etape_17_declaration": 8,
      "etape_18_apurement": 5,
      "etape_19_mainlevee": 5
    }
  }
}
```

---

## 🗄️ **Base de données embarquée**

### **Modèle de données UEMOA**

```javascript
// Structure manifeste UEMOA
const manifeste = {
  // Identifiants
  id: "SEN_5016_2025",
  numero_manif: 5016,
  annee_manif: "2025",
  bureau_manif: "18N",
  
  // Informations transport
  consignataire: "MAERSK LINE SENEGAL",
  navire: "MARCO POLO",
  provenance: "ROTTERDAM",
  date_arrivee: "2025-01-15",
  
  // Workflow tracking
  statut: "MANIFESTE_CREE",
  etapeWorkflow: "CREATION_MANIFESTE",
  
  // Suivi 21 étapes
  workflow: {
    etape1_manifesteRecu: Date,
    etape2_informationsEnregistrees: Date,
    etape3_stockageLocal: Date,
    etape4_transmissionKit: null,
    etape5_extractionTransmise: null,
    etape17_declarationRecue: null,
    etape18_apurement: null,
    etape19_mainlevee: null
  },
  
  // Articles UEMOA
  articles: [{
    art: 1,
    pays_dest: "MALI",
    ville_dest: "BAMAKO",
    marchandise: "Véhicule particulier",
    poids: 1500,
    destinataire: "IMPORT SARL BAMAKO"
  }]
};
```

### **États workflow**

| Statut | Étapes | Description |
|--------|--------|-------------|
| `MANIFESTE_CREE` | 1-3 | Créé et stocké au Port de Dakar |
| `TRANSMIS_VERS_DESTINATION` | 4-5 | Transmis vers Kit MuleSoft |
| `ERREUR_TRANSMISSION` | 4-5 | Échec transmission Kit |
| `DECLARATION_RECUE` | 17 | Infos recouvrement reçues |
| `APURE` | 18 | Manifeste apuré |
| `MAINLEVEE_ATTRIBUEE` | 19 | Bon à enlever attribué |

---

## 🔧 **Kit MuleSoft Integration**

### **Configuration connexion**

```javascript
// lib/kit-client.js
const KitClient = {
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 90000,
  paysCode: 'SEN',
  headers: {
    'X-Source-Country': 'SEN',
    'X-Source-System': 'SENEGAL_DOUANES_DAKAR',
    'X-Source-Port': 'PORT_DAKAR'
  }
};
```

### **ÉTAPES 4-5 : Transmission manifeste**

```javascript
// Transmission vers Kit MuleSoft
async function transmettreManifeste(manifeste) {
  // 1. Validation manifeste Sénégal
  // 2. Préparation extraction pour destination  
  // 3. Envoi POST /manifeste/transmission
  // 4. Gestion réponse et retry si échec
}
```

### **Tests connectivité**

```javascript
// API test Kit : /api/kit/test
// - Health check Kit MuleSoft
// - Test transmission manifeste
// - Diagnostic connectivité réseau
```

---

## 🎨 **Interface utilisateur**

### **🖥️ Dashboard interactif** - `public/index.html`

**Fonctionnalités** :
- ✅ **Formulaire UEMOA** : Création manifeste format natif
- ✅ **Gestion articles** : Ajout/suppression dynamique
- ✅ **Conteneurs** : Support conteneurs par article
- ✅ **Tests Kit** : Connectivité MuleSoft en temps réel
- ✅ **Manifestes récents** : Liste avec statuts
- ✅ **Interface apurement** : ÉTAPES 18-19 intégrées
- ✅ **Statistiques live** : Métriques temps réel
- ✅ **Interactions Kit** : Monitoring échanges

### **🎯 Workflow utilisateur**

1. **Création manifeste** : Formulaire UEMOA complet
2. **Transmission automatique** : Vers Kit MuleSoft si connecté
3. **Suivi temps réel** : Statut dans liste manifestes
4. **Réception autorisation** : Automatique depuis Mali
5. **Interface apurement** : Accessible via URL ou manuel
6. **Confirmation finale** : Workflow terminé

### **🔄 Interface apurement avancée**

L'interface d'apurement peut être ouverte :
- **URL directe** : `?apurement_manifeste=5016&apurement_paiement=PAY-MLI-001`
- **Depuis liste** : Clic sur manifeste éligible
- **Popup dédiée** : Interface spécialisée étapes 18-19

---

## 🚛 **Support Transit**

### **Workflow Transit (16 étapes)**

```javascript
// ÉTAPES 1-6 : Création transit Sénégal
const declarationTransit = {
  numeroDeclaration: "TRA-SEN-2025-001",
  paysDepart: "SEN",
  paysDestination: "MLI", 
  transporteur: "TRANSPORT SAHEL",
  modeTransport: "ROUTIER",
  itineraire: "Dakar-Bamako via Kayes",
  delaiRoute: "72 heures",
  marchandises: [/* marchandises */]
};

// ÉTAPE 14 : Message arrivée Mali
const messageArrivee = {
  numeroDeclaration: "TRA-SEN-2025-001",
  bureauArrivee: "10S_BAMAKO",
  dateArrivee: "2025-01-18T10:30:00Z",
  controleEffectue: true,
  conformiteItineraire: true
};
```

---

## 📈 **Monitoring et Observabilité**

### **Health Check avancé**

```bash
curl http://localhost:3001/api/health
```

**Contrôles effectués** :
- ✅ Service Sénégal actif  
- ✅ Kit MuleSoft accessible
- ✅ Base de données opérationnelle
- ✅ Workflow 21 étapes supporté
- ✅ Format UEMOA validé

### **Métriques disponibles**

- **Volume** : Manifestes créés, transmissions
- **Performance** : Latence Kit, taux de réussite  
- **Workflow** : Progression étapes 1-19
- **Erreurs** : Échecs transmission, validations
- **Pays destinations** : Mali, Burkina Faso, Niger...

### **Logs structurés**

```javascript
// Exemples logs workflow
console.log('🇸🇳 [SÉNÉGAL] ÉTAPES 1-3: Manifeste créé au Port de Dakar');
console.log('🚀 [SÉNÉGAL] ÉTAPES 4-5: Transmission Kit MuleSoft');  
console.log('📥 [SÉNÉGAL] ÉTAPE 17: Autorisation reçue depuis Mali');
console.log('✅ [SÉNÉGAL] ÉTAPES 18-19: Workflow terminé avec succès');
```

---

## 🔒 **Sécurité et Authentification**

### **Headers sécurité**

```http
# Identification système
X-Source-Country: SEN
X-Source-System: SENEGAL_DOUANES_DAKAR
X-Source-Port: PORT_DAKAR

# Workflow tracking  
X-Correlation-ID: SEN_2025_001_123456789
X-Workflow-Step: 5_TRANSMISSION_TO_MALI
X-Manifeste-Format: UEMOA

# Autorisation (étape 17)
X-Authorization-Source: KIT_MULESOFT
X-Payment-Reference: PAY-MLI-2025-001
```

### **CORS configuré**

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Source-Country, 
  X-Correlation-ID, X-Payment-Reference
```

---

## 🧪 **Tests et Validation**

### **Tests automatiques**

```bash
# Test health check
curl http://localhost:3001/api/health

# Test création manifeste UEMOA
curl -X POST http://localhost:3001/api/manifeste/creer \
  -H "Content-Type: application/json" \
  -H "X-Source-Country: SEN" \
  -d @test-manifeste-uemoa.json

# Test connectivité Kit
curl http://localhost:3001/api/kit/test?type=health
```

### **Validation workflow**

1. **ÉTAPES 1-5** : Créer manifeste → Vérifier transmission Kit
2. **ÉTAPE 17** : Simuler réception autorisation Mali  
3. **ÉTAPES 18-19** : Confirmer apurement → Vérifier bon enlever
4. **Intégration** : Workflow complet Sénégal-Mali via Kit

### **Données de test**

```json
// Manifeste test UEMOA complet
{
  "annee_manif": "2025",
  "bureau_manif": "18N",
  "numero_manif": 5016,
  "consignataire": "MAERSK LINE SENEGAL",
  "navire": "MARCO POLO",
  "provenance": "ROTTERDAM",
  "date_arrivee": "2025-01-15",
  "articles": [{
    "art": 1,
    "pays_dest": "MALI",
    "ville_dest": "BAMAKO", 
    "marchandise": "Véhicule Toyota Corolla",
    "destinataire": "IMPORT SARL BAMAKO"
  }]
}
```

---

## 🚀 **Déploiement**

### **Variables d'environnement**

```env
# Configuration serveur
PORT=3001
NODE_ENV=production

# Kit MuleSoft
KIT_MULESOFT_URL=https://kit-mulesoft.herokuapp.com/api/v1
KIT_TIMEOUT=90000

# Sénégal spécifique
PAYS_CODE=SEN
PAYS_NOM=Sénégal
PORT_NAME="Port de Dakar"
PAYS_ROLE=PAYS_PRIME_ABORD
```

### **Déploiement Vercel**

```json
// vercel.json
{
  "version": 2,
  "builds": [{"src": "server.js", "use": "@vercel/node"}],
  "routes": [{"src": "/(.*)", "dest": "server.js"}]
}
```

### **Scripts npm**

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js", 
    "local": "node server.js",
    "test": "curl http://localhost:3001/api/health"
  }
}
```

---

## 🔧 **Maintenance et Dépannage**

### **Problèmes courants**

**❌ Kit MuleSoft inaccessible**
```bash
# Vérifier connectivité
curl http://localhost:8080/api/v1/health

# Forcer mode local
KIT_MULESOFT_URL="" npm start
```

**❌ Port déjà utilisé** 
```bash
# Changer port
PORT=3002 npm start
```

**❌ Erreur validation UEMOA**
```javascript
// Vérifier format manifeste
const erreurs = [
  'numero_manif requis',
  'consignataire requis', 
  'articles requis avec pays_dest'
];
```

### **Mode dégradé**

Le système fonctionne même sans Kit MuleSoft :
- ✅ **Création manifestes** : Stockage local
- ✅ **Interface web** : Complètement fonctionnelle  
- ⚠️ **Transmission** : Mode local uniquement
- ✅ **Apurement** : Interface disponible

---

## 📚 **Documentation complémentaire**

### **Références UEMOA**

- 📄 **Rapport PDF** : Étude interconnexion systèmes douaniers
- 🔗 **Figure 19** : Architecture fonctionnelle libre pratique
- 🔗 **Figure 20** : Scénario technique transit  
- 📋 **21 étapes** : Workflow libre pratique complet
- 📋 **16 étapes** : Workflow transit inter-états

### **Standards supportés**

- ✅ **Format UEMOA 2025.1** : Manifestes natifs
- ✅ **Codes pays** : SEN, MLI, BFA, NER, CIV, TGO, BEN, GNB
- ✅ **Workflow OMD** : Conformité standards internationaux
- ✅ **API REST** : Intégration Kit MuleSoft

### **Écosystème complet**

1. **🇸🇳 Simulateur Sénégal** (ce projet) - Pays A prime abord
2. **🇲🇱 Simulateur Mali** - Pays B destination  
3. **🔗 Kit MuleSoft** - Interconnexion UEMOA
4. **🏛️ Commission UEMOA** - Supervision centrale

---

## 👥 **Équipe et Support**

**Développé par** : Cabinet Jasmine Conseil  
**Conformité** : Rapport PDF UEMOA - Interconnexion SI Douaniers  
**Version** : 1.0.0-UEMOA  
**Format** : UEMOA 2025.1  
**Runtime** : Node.js 22.x  

**Contact technique** : Port de Dakar - Système Douanier Sénégal  
**Support** : Interface web avec diagnostic intégré

---

*Simulateur Sénégal - Port de Dakar - Pays de Prime Abord UEMOA*
