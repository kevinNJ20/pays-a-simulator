# 🇸🇳 Système Douanier Sénégal - Port de Dakar

> **Simulateur d'interconnexion douanière UEMOA** - Pays de Prime Abord  
> Version 1.0.0 | Node.js 22.x | Format UEMOA 2025.1

---

## 📋 Table des Matières

- [Démarrage rapide](#-démarrage-rapide)
- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Workflows](#-workflows)
- [Services & APIs](#-services--apis)
- [Structures de Données](#-structures-de-données)
- [Installation](#-installation-et-démarrage)
- [Exécution en HTTP](#-exécution-en-http)
- [Exécution en HTTPS](#-exécution-en-https)
- [Tests et Vérification](#-tests-et-vérification)
- [Utilisation](#-utilisation)
- [Dépannage](#-dépannage)

---

## ⚡ Démarrage rapide

### Pour démarrer en 3 minutes

```bash
# 1. Cloner et installer
git clone <repository-url>
cd pays-a-simulator
npm install

# 2. Lancer en HTTP (le plus simple)
npm start

# 3. Accéder à l'interface
# Ouvrir http://localhost:3001 dans un navigateur
# Se connecter : douane / douane2025
```

### Pour activer HTTPS

```bash
# 1. Générer les certificats SSL (script automatique)
./generate-ssl.sh

# OU génération manuelle
cd ssl-certs
openssl genrsa -out key.pem 4096
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -config openssl.cnf
cd ..

# 2. Relancer l'application
npm start

# 3. Accéder en HTTPS
# Ouvrir https://localhost:3443 (accepter l'avertissement de sécurité)
```

### Sur serveur Digital Ocean

```bash
# Connexion SSH
ssh root@64.225.5.75

# Cloner et installer
git clone <repository-url>
cd pays-a-simulator
npm install

# Lancer en HTTP
npm start
# Accès : http://64.225.5.75:3001

# OU lancer en HTTPS (après génération certificats)
npm start
# Accès : https://64.225.5.75:3443
```

**📖 Pour plus de détails** : Consultez les sections [Installation](#-installation-et-démarrage), [HTTP](#-exécution-en-http) et [HTTPS](#-exécution-en-https).

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

## 🚀 Installation et Démarrage

### Prérequis

- **Node.js 22.x** (vérifier avec `node --version`)
- **npm** ou **yarn** (vérifier avec `npm --version`)
- **Ports disponibles** : 3001 (HTTP) et 3443 (HTTPS)
- **OpenSSL** (pour générer les certificats SSL - généralement pré-installé sur Linux/Mac)

### 📥 Installation depuis le dépôt

#### Sur un serveur Digital Ocean (ou autre instance Linux)

```bash
# 1. Se connecter au serveur
ssh root@64.225.5.75

# 2. Cloner le projet
git clone <repository-url>
cd pays-a-simulator

# 3. Installer les dépendances
npm install

# 4. Lancer l'application (voir options ci-dessous)
```

#### En local (développement)

```bash
# 1. Cloner le projet
git clone <repository-url>
cd pays-a-simulator

# 2. Installer les dépendances
npm install
```

### 🔧 Configuration Environnement

Créer un fichier `.env` à la racine du projet (optionnel) :

```bash
# Ports
HTTP_PORT=3001
HTTPS_PORT=3443

# Configuration HTTPS
USE_HTTPS=true                    # Activer HTTPS si certificats présents
REDIRECT_TO_HTTPS=false           # Rediriger HTTP → HTTPS (true/false)

# Kit MuleSoft
KIT_MULESOFT_URL=http://64.225.5.75:8086/api/v1

# Pays
PAYS_CODE=SEN
PAYS_ROLE=PAYS_PRIME_ABORD
```

**Note** : Si le fichier `.env` n'existe pas, l'application utilise les valeurs par défaut.

---

## 🌐 Exécution en HTTP

### Mode HTTP simple (développement local)

```bash
# Lancer en HTTP uniquement
npm start
# ou
npm run dev
```

**Résultat** :
- ✅ Serveur HTTP démarré sur `http://localhost:3001`
- ✅ Accessible depuis : `http://64.225.5.75:3001` (si sur serveur)
- ✅ Dashboard : `http://localhost:3001` ou `http://64.225.5.75:3001`

### Vérification

```bash
# Test de santé
curl http://localhost:3001/api/health

# Test depuis le serveur
curl http://64.225.5.75:3001/api/health
```

---

## 🔐 Exécution en HTTPS

### Étape 1 : Générer les certificats SSL

L'application nécessite des certificats SSL dans le dossier `ssl-certs/`. Deux options :

#### Option A : Certificats auto-signés (développement/test)

**Méthode 1 : Script automatique (recommandé)**

```bash
# Depuis la racine du projet
./generate-ssl.sh
```

**Méthode 2 : Génération manuelle**

```bash
# Depuis la racine du projet
cd ssl-certs

# Générer la clé privée
openssl genrsa -out key.pem 4096

# Générer le certificat auto-signé (valide 365 jours)
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -config openssl.cnf

# Vérifier que les fichiers sont créés
ls -la key.pem cert.pem
```

**Note Windows** : Utiliser Git Bash ou WSL pour exécuter le script. Sinon, utiliser la méthode manuelle avec OpenSSL pour Windows.

**⚠️ Important** : Les certificats auto-signés génèrent un avertissement de sécurité dans le navigateur. Acceptez-le pour continuer.

#### Option B : Certificats Let's Encrypt (production)

Pour un certificat valide sans avertissement :

```bash
# Installer Certbot
sudo apt-get update
sudo apt-get install certbot

# Obtenir un certificat (nécessite un nom de domaine)
sudo certbot certonly --standalone -d votre-domaine.com

# Copier les certificats dans ssl-certs/
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem ssl-certs/key.pem
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem ssl-certs/cert.pem
sudo chown $USER:$USER ssl-certs/*.pem
```

### Étape 2 : Activer HTTPS

#### Méthode 1 : Certificats détectés automatiquement

Si les fichiers `ssl-certs/cert.pem` et `ssl-certs/key.pem` existent, HTTPS est activé automatiquement :

```bash
npm start
```

**Résultat** :
- ✅ Serveur HTTP sur port 3001
- ✅ Serveur HTTPS sur port 3443
- ✅ Les deux fonctionnent en parallèle (pas de redirection)

#### Méthode 2 : Forcer HTTPS avec variable d'environnement

```bash
# Activer HTTPS explicitement
USE_HTTPS=true npm start

# Avec redirection HTTP → HTTPS
USE_HTTPS=true REDIRECT_TO_HTTPS=true npm start
```

### Étape 3 : Accéder à l'application HTTPS

**En local** :
- HTTPS : `https://localhost:3443`
- HTTP : `http://localhost:3001` (redirigé si `REDIRECT_TO_HTTPS=true`)

**Sur serveur Digital Ocean** :
- HTTPS : `https://64.225.5.75:3443`
- HTTP : `http://64.225.5.75:3001` (redirigé si `REDIRECT_TO_HTTPS=true`)

### ⚠️ Gestion de l'avertissement de sécurité (certificats auto-signés)

Lors de l'accès à HTTPS avec un certificat auto-signé :

**Chrome/Edge** :
1. Cliquez sur "Avancé"
2. Cliquez sur "Continuer vers le site (non sécurisé)"

**Firefox** :
1. Cliquez sur "Avancé"
2. Cliquez sur "Accepter le risque et continuer"

**cURL** (pour les tests) :
```bash
# Ignorer la vérification SSL (développement uniquement)
curl -k https://localhost:3443/api/health
```

---

## 🧪 Tests et Vérification

### Test 1 : Santé de l'application

```bash
# HTTP
curl http://localhost:3001/api/health

# HTTPS (avec certificat auto-signé)
curl -k https://localhost:3443/api/health
```

**Réponse attendue** :
```json
{
  "status": "OK",
  "pays": "SEN",
  "port": "Port de Dakar",
  "kitMuleSoft": {
    "accessible": true,
    "latence": 123
  }
}
```

### Test 2 : Statistiques

```bash
curl http://localhost:3001/api/statistiques
```

### Test 3 : Création d'un manifeste (workflow complet)

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

### Test 4 : Interface Web

1. Ouvrir un navigateur
2. Accéder à `http://localhost:3001` (ou `https://localhost:3443`)
3. Se connecter avec :
   - **Username** : `douane`
   - **Password** : `douane2025`
4. Tester les workflows depuis l'interface

---

## 📋 Commandes Disponibles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer le serveur (HTTP + HTTPS si certificats présents) |
| `npm run dev` | Alias de `npm start` |
| `npm run local` | Alias de `npm start` |

### Variables d'environnement utiles

```bash
# HTTP uniquement (désactiver HTTPS même si certificats présents)
USE_HTTPS=false npm start

# HTTPS avec redirection automatique HTTP → HTTPS
USE_HTTPS=true REDIRECT_TO_HTTPS=true npm start

# Changer les ports
HTTP_PORT=8080 HTTPS_PORT=8443 npm start
```

---

## 🏗️ Architecture de l'Application

### Structure des dossiers

```
pays-a-simulator/
├── api/                    # Endpoints API REST
│   ├── auth/              # Authentification
│   ├── manifeste/         # Workflow Libre Pratique
│   ├── transit/          # Workflow Transit
│   ├── apurement/        # Apurement et main levée
│   └── health.js         # Santé système
├── lib/                   # Bibliothèques
│   ├── database.js       # Base de données in-memory
│   └── kit-client.js     # Client Kit MuleSoft
├── public/                # Interface web (HTML/CSS/JS)
├── ssl-certs/             # Certificats SSL
│   ├── cert.pem         # Certificat (à générer)
│   ├── key.pem          # Clé privée (à générer)
│   └── openssl.cnf      # Configuration OpenSSL
├── server.js             # Serveur HTTP/HTTPS principal
├── package.json          # Dépendances Node.js
└── README.md            # Ce fichier
```

### Flux de données

```
Interface Web (public/)
    ↓
Serveur Node.js (server.js)
    ↓
APIs REST (api/)
    ↓
Base de données (lib/database.js)
    ↓
Client Kit MuleSoft (lib/kit-client.js)
    ↓
Kit d'Interconnexion MuleSoft (64.225.5.75:8086)
    ↓
Pays de destination (Mali, Burkina, etc.)
```

---

## 🔍 Comprendre l'Application

### Rôle dans l'écosystème UEMOA

Cette application simule le **Système Douanier du Sénégal - Port de Dakar**, qui joue le rôle de **Pays de Prime Abord** dans l'espace UEMOA.

**Fonctions principales** :
1. **Réception des manifestes** : Enregistrement des marchandises arrivant au Port de Dakar
2. **Transmission vers pays enclavés** : Envoi des extractions vers le Mali, Burkina Faso, Niger via le Kit MuleSoft
3. **Réception des déclarations** : Retour d'information des pays de destination
4. **Apurement et main levée** : Libération des marchandises après vérification des paiements

### Workflows implémentés

#### 1. Libre Pratique (21 étapes)
- **Étapes 1-5** : Création manifeste → Transmission Kit → Pays destination
- **Étape 17** : Réception informations déclaration/paiement
- **Étapes 18-19** : Apurement → Bon à enlever

#### 2. Transit (16 étapes)
- **Étapes 1-11** : Création transit → Transmission Kit
- **Étape 14** : Message arrivée destination
- **Étapes 15-16** : Apurement transit → Libération garanties

### Technologies utilisées

- **Backend** : Node.js 22.x avec serveur HTTP/HTTPS natif
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Données** : Stockage in-memory (Map, Set) - pas de base de données externe
- **Interconnexion** : Axios pour communication avec Kit MuleSoft
- **Sécurité** : HTTPS avec certificats SSL, authentification par session

---

## 💻 Utilisation

### Interface Web

Accéder à l'interface via HTTP ou HTTPS :

| URL | Description |
|-----|-------------|
| `http://localhost:3001/login.html` | Authentification (HTTP) |
| `https://localhost:3443/login.html` | Authentification (HTTPS) |
| `http://localhost:3001/libre-pratique.html` | Dashboard Libre Pratique (HTTP) |
| `https://localhost:3443/libre-pratique.html` | Dashboard Libre Pratique (HTTPS) |
| `http://localhost:3001/transit.html` | Dashboard Transit (HTTP) |
| `https://localhost:3443/transit.html` | Dashboard Transit (HTTPS) |

**Sur serveur Digital Ocean** : Remplacer `localhost` par `64.225.5.75`

### Comptes de test

| Username | Password | Accès |
|----------|----------|-------|
| `admin` | `admin123` | Tous workflows |
| `douane` | `douane2025` | Tous workflows |
| `lp_user` | `lp123` | Libre pratique uniquement |
| `transit_user` | `transit123` | Transit uniquement |

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

### Problèmes courants

| Problème | Solution |
|----------|----------|
| **Kit MuleSoft inaccessible** | Vérifier `http://64.225.5.75:8086/api/v1/health` depuis le serveur |
| **Port 3001 occupé** | Modifier `HTTP_PORT` dans `.env` ou utiliser `HTTP_PORT=8080 npm start` |
| **Port 3443 occupé** | Modifier `HTTPS_PORT` dans `.env` ou utiliser `HTTPS_PORT=8443 npm start` |
| **Erreur manifeste** | Vérifier format UEMOA (voir exemples dans section Utilisation) |
| **HTTPS ne démarre pas** | Vérifier que `ssl-certs/cert.pem` et `ssl-certs/key.pem` existent |
| **Erreur "cert.pem not found"** | Générer les certificats SSL (voir section HTTPS) |
| **Avertissement sécurité navigateur** | Normal avec certificats auto-signés - accepter l'avertissement |
| **Redirection HTTP → HTTPS ne fonctionne pas** | Vérifier `REDIRECT_TO_HTTPS=true` dans `.env` ou en ligne de commande |
| **Module non trouvé** | Exécuter `npm install` pour installer les dépendances |
| **Node.js version incorrecte** | Utiliser Node.js 22.x : `nvm use 22` ou installer depuis nodejs.org |

### Vérifications de base

```bash
# 1. Vérifier Node.js
node --version  # Doit être 22.x

# 2. Vérifier npm
npm --version

# 3. Vérifier les dépendances installées
ls node_modules/

# 4. Vérifier les certificats SSL (si HTTPS)
ls -la ssl-certs/cert.pem ssl-certs/key.pem

# 5. Vérifier les ports disponibles
netstat -tuln | grep -E '3001|3443'

# 6. Tester la connectivité Kit MuleSoft
curl http://64.225.5.75:8086/api/v1/health
```

### Logs et débogage

Les logs de l'application affichent :
- ✅ Requêtes HTTP/HTTPS entrantes
- ✅ Interactions avec le Kit MuleSoft
- ✅ Erreurs et exceptions
- ✅ Statut des workflows

Pour plus de détails, consulter la console du serveur où `npm start` a été exécuté.

### Support technique

Si le problème persiste :
1. Vérifier les logs du serveur
2. Vérifier la connectivité réseau vers `64.225.5.75:8086`
3. Vérifier les permissions sur les fichiers (notamment `ssl-certs/`)
4. Consulter la section "Documentation Complémentaire" ci-dessous

---

## 📞 Support

**Développé par** : Cabinet Jasmine Conseil  
**Version** : 1.0.0-UEMOA  
**Contact** : douanes.dakar@gouv.sn

---

© 2025 Cabinet Jasmine Conseil - Tous droits réservés