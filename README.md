# 🇸🇳 Système Douanier Sénégal - Port de Dakar

> **Simulateur d'interconnexion douanière UEMOA** - Pays de Prime Abord  
> Version 1.0.0 | Node.js 22.x | Format UEMOA 2025.1

---

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Workflows](#-workflows)
- [Services & APIs](#-services--apis)
- [Structures de Données](#-structures-de-données)
- [Installation](#-installation)
- [Utilisation](#-utilisation)

---

## 🎯 Vue d'ensemble

### Rôle dans l'écosystème UEMOA

Le Sénégal est le **Pays de Prime Abord** - point d'entrée des marchandises dans l'espace UEMOA via le Port de Dakar. Il gère :

- **Entrée des marchandises** → Création manifestes et transmission vers pays enclavés
- **Retour d'information** → Réception déclarations et autorisations
- **Apurement final** → Levée des marchandises et libération garanties

```
Marchandises → Port Dakar → Kit MuleSoft → Mali/Burkina/Niger
                    ↓                              ↓
              Étapes 1-5                    Étapes 6-16
                    ↑                              ↓
              Étapes 17-19 ← Kit MuleSoft ← Déclaration/Paiement
```

---

## 🏗️ Architecture

### Composants principaux

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTÈME SÉNÉGAL                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │  Interface   │───▶│   Serveur    │───▶│  Base de    │ │
│  │     Web      │    │   Node.js    │    │  Données    │ │
│  │ (HTML/JS/CSS)│◀───│  (HTTP/S)    │◀───│ (In-Memory) │ │
│  └──────────────┘    └──────────────┘    └─────────────┘ │
│         │                    │                             │
│         │                    │                             │
│         ▼                    ▼                             │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │     Auth     │    │ Kit MuleSoft │                    │
│  │   Module     │    │    Client    │                    │
│  └──────────────┘    └──────────────┘                    │
│                              │                             │
└──────────────────────────────┼─────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Kit d'Interconnexion│
                    │      MuleSoft        │
                    │  (64.225.5.75:8086) │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Pays Destination  │
                    │ (Mali, Burkina, etc)│
                    └─────────────────────┘
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js 22.x (HTTP/HTTPS) |
| **Données** | In-Memory Maps (Map, Set) |
| **Auth** | Session-based avec tokens |
| **API** | RESTful JSON |
| **Interconnexion** | Kit MuleSoft (Axios HTTP client) |

---

## 🔄 Workflows

### 1. Workflow Libre Pratique (21 étapes totales)

Le Sénégal gère **6 étapes sur 21** :

#### Étapes 1-5 : Entrée et Transmission (Automatique)

```javascript
// POST /api/manifeste/creer
{
  annee_manif: "2025",
  bureau_manif: "18N",
  numero_manif: 5016,
  consignataire: "MAERSK LINE",
  articles: [{
    pays_dest: "MALI",
    marchandise: "Véhicule Toyota"
  }]
}
```

**Flux** :
1. Consignataire télécharge manifeste → Port de Dakar
2. Système enregistre informations marchandises
3. Extraction créée pour pays destination
4. Transmission vers Kit MuleSoft
5. Kit route vers Mali

#### Étape 17 : Retour d'information (Automatique)

```javascript
// POST /api/mainlevee/autorisation
{
  numeroManifeste: "5016",
  montantAcquitte: 250000,
  paysDeclarant: "MLI",
  referencePaiement: "PAY-MLI-2025-001"
}
```

Le Mali envoie via Kit MuleSoft :
- Référence déclaration
- Montant acquitté
- Référence paiement

#### Étapes 18-19 : Apurement et Levée (Manuel)

```javascript
// POST /api/apurement/traiter
{
  numeroManifeste: "5016",
  referencePaiement: "PAY-MLI-2025-001",
  agentConfirmation: "AGENT_DAKAR",
  observations: "RAS - Paiement vérifié"
}
```

**Action humaine requise** :
- Agent douanier vérifie documents
- Confirme paiement effectué
- Délivre Bon à Enlever (BAE)

### 2. Workflow Transit (16 étapes totales)

Le Sénégal gère **9 étapes sur 16** :

#### Étapes 1-9 : Création Transit (Automatique)

```javascript
// POST /api/transit/creer
{
  numeroDeclaration: "TRA-SEN-2025-001",
  transporteur: "TRANSPORT SAHEL",
  paysDestination: "MALI",
  cautionRequise: 500000,
  marchandises: [{
    designation: "Matériel informatique",
    poids: 2500
  }]
}
```

**Inclut automatiquement** :
- Étapes 7-9 : Prise garanties, paiement, autorisation départ
- Étapes 10-11 : Transmission copie vers Mali

#### Étape 14 : Message Arrivée (Automatique)

```javascript
// POST /api/transit/arrivee
{
  numeroDeclaration: "TRA-SEN-2025-001",
  bureauArrivee: "BAMAKO_PRINCIPAL",
  controleEffectue: true
}
```

Mali confirme arrivée marchandises.

#### Étapes 15-16 : Apurement Transit (Manuel)

```javascript
// POST /api/transit/apurer
{
  numeroDeclaration: "TRA-SEN-2025-001",
  agentApurement: "AGENT_TRANSIT_DAKAR"
}
```

**Action humaine requise** :
- Vérification conformité itinéraire
- Vérification délais respectés
- Libération garanties (caution)

---

## 🔌 Services & APIs

### Service d'Authentification

**Module** : `api/auth/`

```javascript
// Login
POST /api/auth/login
{
  username: "douane",
  password: "douane2025",
  workflow: "libre-pratique"
}

// Vérification
GET /api/auth/verify
Headers: { Authorization: "Bearer <token>" }

// Logout
POST /api/auth/logout
```

**Comptes disponibles** :
- `admin / admin123` - Tous workflows
- `douane / douane2025` - Tous workflows
- `lp_user / lp123` - Libre pratique
- `transit_user / transit123` - Transit

### Service Manifeste (Libre Pratique)

**Module** : `api/manifeste/`

| Endpoint | Méthode | Étapes | Description |
|----------|---------|--------|-------------|
| `/creer` | POST | 1-5 | Création + transmission Kit |
| `/lister` | GET | - | Liste des manifestes |

### Service Main Levée

**Module** : `api/mainlevee/`, `api/apurement/`

| Endpoint | Méthode | Étape | Description |
|----------|---------|-------|-------------|
| `/mainlevee/autorisation` | POST | 17 | Réception info Mali |
| `/apurement/traiter` | GET | - | Consultation avant apurement |
| `/apurement/traiter` | POST | 18-19 | Apurement + levée |

### Service Transit

**Module** : `api/transit/`

| Endpoint | Méthode | Étapes | Description |
|----------|---------|--------|-------------|
| `/creer` | POST | 1-11 | Création + transmission |
| `/arrivee` | POST | 14 | Message arrivée Mali |
| `/apurer` | POST | 15-16 | Apurement + libération |
| `/lister` | GET | - | Liste des transits |

### Service Système

| Endpoint | Description |
|----------|-------------|
| `/api/health` | État système + Kit MuleSoft |
| `/api/statistiques` | Métriques temps réel |

### Client Kit MuleSoft

**Module** : `lib/kit-client.js`

```javascript
const kitClient = require('./lib/kit-client');

// Transmettre manifeste
await kitClient.transmettreManifeste(manifeste);

// Transmettre transit
await kitClient.transmettreTransit(transit);

// Notifier apurement
await kitClient.notifierApurement(data);

// Vérifier santé
await kitClient.verifierSante();
```

**Configuration** :
- URL : `http://64.225.5.75:8086/api/v1`
- Timeout : 90s
- Headers automatiques : `X-Source-Country: SEN`

---

## 📊 Structures de Données

### Manifeste (Format UEMOA)

```javascript
{
  // Identification
  id: "SEN_5016_2025",
  annee_manif: "2025",
  bureau_manif: "18N",
  numero_manif: 5016,
  
  // Transport
  consignataire: "MAERSK LINE",
  navire: "MARCO POLO",
  provenance: "ROTTERDAM",
  date_arrivee: "2025-01-15",
  
  // Workflow
  statut: "MANIFESTE_CREE", // → TRANSMIS_VERS_DESTINATION → DECLARATION_RECUE → APURE → MAINLEVEE_ATTRIBUEE
  etapeWorkflow: "CREATION_MANIFESTE",
  
  // Articles
  articles: [{
    art: 1,
    pays_dest: "MALI",
    ville_dest: "BAMAKO",
    marchandise: "Véhicule Toyota",
    poids: 1500,
    destinataire: "IMPORT SARL",
    conteneurs: [{
      conteneur: "MAEU1234567",
      type: "DRS",
      taille: "40",
      plomb: "SN123456"
    }]
  }],
  
  // Transmission Kit
  transmissionKit: {
    statut: "TRANSMIS_KIT",
    dateTransmission: "2025-01-15T10:00:00Z",
    latence: 450
  },
  
  // Informations déclaration (Étape 17)
  informationsDeclaration: {
    referenceDeclaration: "DEC-MLI-2025-001",
    montantAcquitte: 250000,
    paysDeclarant: "MLI",
    referencePaiement: "PAY-MLI-001"
  },
  
  // Apurement (Étape 18)
  apurement: {
    id: "APU_SEN_...",
    agentConfirmation: "AGENT_DAKAR",
    dateApurement: "2025-01-20T14:00:00Z",
    statutApurement: "CONFIRME"
  },
  
  // Bon à enlever (Étape 19)
  bonEnlever: {
    id: "BAE_SEN_...",
    dateMainlevee: "2025-01-20T14:05:00Z",
    portEnlevement: "Port de Dakar"
  }
}
```

### Déclaration Transit

```javascript
{
  // Identification
  id: "TRA_SEN_...",
  numeroDeclaration: "TRA-SEN-2025-001",
  
  // Transport
  transporteur: "TRANSPORT SAHEL",
  modeTransport: "ROUTIER",
  paysDepart: "SEN",
  paysDestination: "MALI",
  itineraire: "Dakar-Bamako via Kayes",
  delaiRoute: "72 heures",
  
  // Workflow
  statut: "TRANSIT_CREE", // → ARRIVEE_CONFIRMEE → TRANSIT_APURE
  
  // Marchandises
  marchandises: [{
    designation: "Matériel informatique",
    poids: 2500,
    nombreColis: 50
  }],
  
  // Garanties
  cautionRequise: 500000,
  referenceCaution: "CAUTION-2025-001",
  
  // Message arrivée (Étape 14)
  messageArrivee: {
    bureauArrivee: "BAMAKO_PRINCIPAL",
    dateArrivee: "2025-01-23T10:00:00Z",
    controleEffectue: true,
    conformiteItineraire: true
  },
  
  // Apurement (Étape 15)
  apurement: {
    id: "APU_TRA_SEN_...",
    agentApurement: "AGENT_TRANSIT",
    dateApurement: "2025-01-23T15:00:00Z"
  },
  
  // Libération garanties (Étape 16)
  liberationGaranties: {
    id: "LIB_GAR_SEN_...",
    cautionLiberee: 500000,
    dateLiberationGaranties: "2025-01-23T15:05:00Z"
  }
}
```

### Base de Données (`lib/database.js`)

```javascript
class PaysADatabase {
  manifestes = new Map();           // Manifestes libre pratique
  declarationsTransit = new Map();  // Déclarations transit
  apurements = new Map();           // Apurements effectués
  interactionsKit = [];             // Historique interactions Kit
  
  statistiques = {
    manifestesCreees: 0,
    transmissionsKit: 0,
    transmissionsReussies: 0,
    autorisationsRecues: 0,
    apurementsTraites: 0,
    transitsCrees: 0
  };
}
```

---

## 🚀 Installation

### Prérequis

- Node.js 22.x
- npm ou yarn
- Port 3001 disponible

### Installation rapide

```bash
git clone <repository-url>
cd simulateur-senegal
npm install
npm start
```

Le serveur démarre sur `http://localhost:3001`

### Configuration environnement

```bash
# .env (optionnel)
PORT=3001
KIT_MULESOFT_URL=http://64.225.5.75:8086/api/v1
PAYS_CODE=SEN
PAYS_ROLE=PAYS_PRIME_ABORD
```

---

## 💻 Utilisation

### Interface Web

| URL | Description |
|-----|-------------|
| `/login.html` | Authentification |
| `/libre-pratique.html` | Dashboard Libre Pratique |
| `/transit.html` | Dashboard Transit |

### Workflow Libre Pratique complet

#### 1. Créer un manifeste

```bash
curl -X POST http://localhost:3001/api/manifeste/creer \
  -H "Content-Type: application/json" \
  -d '{
    "annee_manif": "2025",
    "bureau_manif": "18N",
    "numero_manif": 5016,
    "consignataire": "MAERSK LINE",
    "navire": "MARCO POLO",
    "date_arrivee": "2025-01-15",
    "articles": [{
      "art": 1,
      "pays_dest": "MALI",
      "ville_dest": "BAMAKO",
      "marchandise": "Véhicule Toyota",
      "poids": 1500,
      "destinataire": "IMPORT SARL"
    }]
  }'
```

**Résultat** : Manifeste créé et transmis au Kit MuleSoft (étapes 1-5)

#### 2. Simuler retour Mali (Étape 17)

```bash
curl -X POST http://localhost:3001/api/mainlevee/autorisation \
  -H "Content-Type: application/json" \
  -d '{
    "numeroManifeste": "5016",
    "montantAcquitte": 250000,
    "paysDeclarant": "MLI",
    "referencePaiement": "PAY-MLI-001"
  }'
```

**Résultat** : Informations déclaration enregistrées, manifeste prêt pour apurement

#### 3. Apurer le manifeste (Étapes 18-19)

```bash
curl -X POST http://localhost:3001/api/apurement/traiter \
  -H "Content-Type: application/json" \
  -d '{
    "numeroManifeste": "5016",
    "referencePaiement": "PAY-MLI-001",
    "agentConfirmation": "AGENT_DAKAR",
    "observations": "RAS - Vérifié"
  }'
```

**Résultat** : Apurement confirmé + Bon à enlever émis

### Workflow Transit complet

#### 1. Créer déclaration transit

```bash
curl -X POST http://localhost:3001/api/transit/creer \
  -H "Content-Type: application/json" \
  -d '{
    "numeroDeclaration": "TRA-SEN-2025-001",
    "transporteur": "TRANSPORT SAHEL",
    "paysDestination": "MALI",
    "cautionRequise": 500000,
    "marchandises": [{
      "designation": "Matériel informatique",
      "poids": 2500,
      "nombreColis": 50
    }]
  }'
```

**Résultat** : Transit créé avec garanties (étapes 1-9) + copie transmise (10-11)

#### 2. Simuler arrivée Mali (Étape 14)

```bash
curl -X POST http://localhost:3001/api/transit/arrivee \
  -H "Content-Type: application/json" \
  -d '{
    "numeroDeclaration": "TRA-SEN-2025-001",
    "bureauArrivee": "BAMAKO_PRINCIPAL",
    "dateArrivee": "2025-01-23T10:00:00Z",
    "controleEffectue": true
  }'
```

**Résultat** : Message arrivée enregistré, transit prêt pour apurement

#### 3. Apurer le transit (Étapes 15-16)

```bash
curl -X POST http://localhost:3001/api/transit/apurer \
  -H "Content-Type: application/json" \
  -d '{
    "numeroDeclaration": "TRA-SEN-2025-001",
    "agentApurement": "AGENT_TRANSIT_DAKAR"
  }'
```

**Résultat** : Transit apuré + garanties libérées

---

## 📚 Documentation Complémentaire

- **Rapport UEMOA** : Spécifications complètes des workflows
- **API Reference** : Voir commentaires dans `/api/*`
- **Kit MuleSoft** : Documentation à `http://64.225.5.75:8086/docs`

---

## 🔧 Dépannage

| Problème | Solution |
|----------|----------|
| Kit MuleSoft inaccessible | Vérifier `http://64.225.5.75:8086/api/v1/health` |
| Port 3001 occupé | Modifier `PORT` dans `.env` |
| Erreur manifeste | Vérifier format UEMOA (voir exemples) |

---

## 📞 Support

**Développé par** : Cabinet Jasmine Conseil  
**Version** : 1.0.0-UEMOA  
**Contact** : douanes.dakar@gouv.sn

---

© 2025 Cabinet Jasmine Conseil - Tous droits réservés