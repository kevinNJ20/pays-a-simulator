# 🇸🇳 Simulateur Système Douanier Sénégal - Port de Dakar

**Version 1.0.0** | Pays de Prime Abord | Node.js 22.x | Format UEMOA 2025.1

---

## 🎯 Rôle dans l'Interconnexion UEMOA

Le Sénégal est le **Pays de Prime Abord** (Pays A) - point d'entrée des marchandises dans l'espace UEMOA via le Port de Dakar.

| Propriété | Valeur |
|-----------|--------|
| **Code Pays** | SEN |
| **Type** | Pays Côtier |
| **Rôle** | PAYS_PRIME_ABORD |
| **Port Principal** | Port de Dakar (Bureau 18N) |
| **Format** | UEMOA 2025.1 |

---

## 📋 Workflows Gérés par le Sénégal

### 1️⃣ Workflow Libre Pratique (21 étapes au total)

Le Sénégal gère **6 étapes sur 21** :

#### **Étapes 1-5 : Entrée et Transmission (AUTOMATIQUE)**
```
Port de Dakar → Kit MuleSoft → Pays de Destination
```

**Détail des étapes :**
- **Étape 1-2** : Téléchargement et réception manifeste par consignataire
- **Étape 3** : Renseignement informations marchandise (articles, conteneurs)
- **Étape 4** : Extraction marchandises pour pays destination
- **Étape 5** : Transmission extraction via Kit MuleSoft

**API correspondante :** `POST /api/manifeste/creer`

#### **Étapes 17-19 : Retour et Apurement (MANUEL)**
```
Mali (Pays B) → Kit MuleSoft → Port de Dakar
```

**Détail des étapes :**
- **Étape 17** : Réception automatique informations déclaration/recouvrement depuis Mali
- **Étape 18** : **👤 MANUEL** - Apurement du manifeste par agent douanier
- **Étape 19** : **👤 MANUEL** - Attribution main levée (Bon à Enlever - BAE)

**APIs correspondantes :**
- `POST /api/mainlevee/autorisation` (Étape 17 - Automatique)
- `GET /api/apurement/traiter` (Consultation avant apurement)
- `POST /api/apurement/traiter` (Étapes 18-19 - Action manuelle agent)

#### **Étapes 6-16 : Traitement au Mali** 
*(Non gérées par le Sénégal - Pays de destination)*

---

### 2️⃣ Workflow Transit (16 étapes au total)

Le Sénégal gère **9 étapes sur 16** :

#### **Étapes 1-9 : Création Transit au Départ (AUTOMATIQUE)**
```
Port de Dakar (Création) → Transit commence
```

**Détail des étapes :**
- **Étapes 1-6** : Création déclaration transit au départ
  - Dépôt et enregistrement déclaration
  - Vérification conformité et recevabilité
  - Enregistrement détaillé
- **Étapes 7-9** : Garanties et autorisation départ (automatique lors création)
  - Prise de garanties (cautions, itinéraire, délais)
  - Paiement redevances transit
  - Délivrance bon à enlever / Autorisation départ

**API :** `POST /api/transit/creer`

#### **Étapes 10-11 : Transmission Copie Transit (AUTOMATIQUE)**
```
Port de Dakar → Kit MuleSoft → Mali (Destination)
```

**Détail :**
- Transmission automatique copie déclaration vers pays destination
- Le Kit MuleSoft route vers le bureau destination

**API :** `POST /api/transit/creer` (inclus dans la création)

#### **Étape 14 : Message Arrivée (AUTOMATIQUE)**
```
Mali → Kit MuleSoft → Port de Dakar
```

**Détail :**
- Réception automatique confirmation arrivée depuis Mali
- Enregistrement contrôles effectués au bureau destination

**API :** `POST /api/transit/arrivee`

#### **Étapes 15-16 : Apurement Transit (MANUEL)**
```
Port de Dakar → Apurement manuel par agent
```

**Détail des étapes :**
- **Étape 15** : **👤 MANUEL** - Apurement du transit par agent douanier
  - Vérification conformité (itinéraire, délais respectés)
  - Confirmation arrivée marchandises
  - Validation contrôles destination
- **Étape 16** : **👤 MANUEL** - Libération des garanties
  - Libération cautions
  - Clôture du transit
  - Archivage dossier

**API :** `POST /api/transit/apurer` (Action manuelle agent)

#### **Étapes 11-13 : Traitement au Mali**
*(Non gérées par le Sénégal - Pays de destination)*

---

## 🚀 Démarrage Rapide

### Installation
```bash
git clone <repository-url>
cd simulateur-senegal
npm install
npm start
```

### Accès
- **Dashboard Libre Pratique** : http://64.225.5.75:3001/libre-pratique.html
- **Dashboard Transit** : http://64.225.5.75:3001/transit.html
- **Health Check** : http://64.225.5.75:3001/api/health
- **Statistiques** : http://64.225.5.75:3001/api/statistiques

---

## 🔌 APIs Principales

### Workflow Libre Pratique

| Étape | Endpoint | Méthode | Type | Description |
|-------|----------|---------|------|-------------|
| 1-5 | `/api/manifeste/creer` | POST | ✅ Auto | Création manifeste + transmission Kit |
| 17 | `/api/mainlevee/autorisation` | POST | ✅ Auto | Réception info paiement Mali |
| 18-19 | `/api/apurement/traiter` | GET | 📋 Info | Consultation avant apurement |
| 18-19 | `/api/apurement/traiter` | POST | 👤 Manuel | Apurement + main levée par agent |
| - | `/api/manifeste/lister` | GET | 📋 Info | Liste manifestes |

### Workflow Transit

| Étape | Endpoint | Méthode | Type | Description |
|-------|----------|---------|------|-------------|
| 1-9 | `/api/transit/creer` | POST | ✅ Auto | Création transit + garanties + autorisation |
| 10-11 | `/api/transit/creer` | POST | ✅ Auto | Transmission copie (inclus) |
| 14 | `/api/transit/arrivee` | POST | ✅ Auto | Message arrivée Mali |
| 15-16 | `/api/transit/apurer` | POST | 👤 Manuel | Apurement + libération garanties par agent |
| - | `/api/transit/lister` | GET | 📋 Info | Liste transits |

### Système

| Endpoint | Description |
|----------|-------------|
| `/api/health` | État système + Kit MuleSoft |
| `/api/statistiques` | Métriques temps réel |
| `/api/auth/login` | Authentification utilisateur |
| `/api/auth/verify` | Vérification session |
| `/api/auth/logout` | Déconnexion |

---

## 📊 Exemple Complet : Workflow Libre Pratique

### 1. Création Manifeste (Étapes 1-5) - AUTOMATIQUE

```bash
curl -X POST http://64.225.5.75:3001/api/manifeste/creer \
  -H "Content-Type: application/json" \
  -d '{
    "annee_manif": "2025",
    "bureau_manif": "18N",
    "numero_manif": 5016,
    "consignataire": "MAERSK LINE SENEGAL",
    "navire": "MARCO POLO",
    "date_arrivee": "2025-01-15",
    "articles": [{
      "art": 1,
      "pays_dest": "MALI",
      "ville_dest": "BAMAKO",
      "marchandise": "Véhicule Toyota",
      "poids": 1500,
      "destinataire": "IMPORT SARL BAMAKO"
    }]
  }'
```

**Résultat :**
```json
{
  "status": "SUCCESS",
  "message": "Manifeste créé et transmis vers Mali",
  "workflow": {
    "etapesCompletes": "1-5",
    "prochaine_etape": "Attente traitement Mali (étapes 6-16)"
  }
}
```

---

### 2. Réception Autorisation Mali (Étape 17) - AUTOMATIQUE

```bash
curl -X POST http://64.225.5.75:3001/api/mainlevee/autorisation \
  -H "Content-Type: application/json" \
  -d '{
    "autorisationMainlevee": {
      "numeroManifeste": "5016",
      "montantAcquitte": 250000,
      "paysDeclarant": "MLI",
      "referencePaiement": "PAY-MLI-2025-001"
    }
  }'
```

---

### 3. Apurement et Levée (Étapes 18-19) - MANUEL PAR AGENT

#### 3.1 Consultation avant apurement
```bash
curl -X GET "http://64.225.5.75:3001/api/apurement/traiter?numeroManifeste=5016&referencePaiement=PAY-MLI-2025-001"
```

#### 3.2 Action manuelle d'apurement par agent
```bash
curl -X POST http://64.225.5.75:3001/api/apurement/traiter \
  -H "Content-Type: application/json" \
  -d '{
    "numeroManifeste": "5016",
    "referencePaiement": "PAY-MLI-2025-001",
    "typeConfirmation": "DOUANE",
    "agentConfirmation": "AGENT_DOUANES_DAKAR",
    "observations": "RAS - Paiement vérifié"
  }'
```

**Résultat :**
```json
{
  "status": "SUCCESS",
  "message": "🎉 Workflow Sénégal terminé - Apurement et levée confirmés",
  "apurement": {
    "id": "APU_SEN_...",
    "statutApurement": "CONFIRME"
  },
  "bonEnlever": {
    "id": "BAE_SEN_...",
    "portEnlevement": "Port de Dakar"
  }
}
```

---

## 📊 Exemple Complet : Workflow Transit

### 1. Création Transit (Étapes 1-9) - AUTOMATIQUE

```bash
curl -X POST http://64.225.5.75:3001/api/transit/creer \
  -H "Content-Type: application/json" \
  -d '{
    "numeroDeclaration": "TRA-SEN-2025-001",
    "transporteur": "TRANSPORT SAHEL",
    "modeTransport": "ROUTIER",
    "paysDestination": "MALI",
    "itineraire": "Dakar-Bamako via Kayes",
    "delaiRoute": "72 heures",
    "cautionRequise": 500000,
    "referenceCaution": "CAUTION-2025-001",
    "marchandises": [{
      "designation": "Matériel informatique",
      "poids": 2500,
      "nombreColis": 50,
      "marques": "HP-DELL"
    }]
  }'
```

**Résultat :**
```json
{
  "status": "SUCCESS",
  "message": "Déclaration transit créée et copie transmise",
  "workflow": {
    "etapesCompletes": "1-11",
    "prochaine_etape": "Attente arrivée Mali (étapes 13-14)"
  },
  "transit": {
    "id": "TRA_SEN_...",
    "numeroDeclaration": "TRA-SEN-2025-001",
    "statut": "TRANSIT_CREE"
  }
}
```

**Notes importantes :**
- ✅ Étapes 1-6 : Création et enregistrement
- ✅ Étapes 7-9 : Garanties/paiement/autorisation départ (automatique)
- ✅ Étapes 10-11 : Transmission copie vers Mali (automatique)

---

### 2. Réception Message Arrivée (Étape 14) - AUTOMATIQUE

```bash
# Cet appel est fait automatiquement par le Mali via le Kit MuleSoft
curl -X POST http://64.225.5.75:3001/api/transit/arrivee \
  -H "Content-Type: application/json" \
  -d '{
    "messageArrivee": {
      "numeroDeclaration": "TRA-SEN-2025-001",
      "bureauArrivee": "BAMAKO_PRINCIPAL",
      "dateArrivee": "2025-01-23T10:00:00Z",
      "controleEffectue": true,
      "visaAppose": true,
      "conformiteItineraire": true,
      "delaiRespecte": true
    }
  }'
```

---

### 3. Apurement Transit (Étapes 15-16) - MANUEL PAR AGENT

#### 3.1 L'agent visualise le transit prêt pour apurement
L'interface web `/transit.html` affiche automatiquement les transits ayant reçu le message d'arrivée (étape 14).

#### 3.2 Action manuelle d'apurement par agent
```bash
curl -X POST http://64.225.5.75:3001/api/transit/apurer \
  -H "Content-Type: application/json" \
  -d '{
    "numeroDeclaration": "TRA-SEN-2025-001",
    "agentApurement": "AGENT_TRANSIT_DAKAR",
    "observations": "Conformité vérifiée - Délai respecté"
  }'
```

**Résultat :**
```json
{
  "status": "SUCCESS",
  "message": "🎉 Workflow Transit terminé - Apurement et libération garanties confirmés",
  "workflow": {
    "status": "TERMINE",
    "etapesCompletes": "1-16 (complet)"
  },
  "apurement": {
    "id": "APU_TRA_SEN_...",
    "numeroDeclaration": "TRA-SEN-2025-001",
    "statutApurement": "CONFIRME",
    "etapeTransit": 15
  },
  "liberationGaranties": {
    "id": "LIB_GAR_SEN_...",
    "cautionLiberee": 500000,
    "etapeTransit": 16
  }
}
```

---

## 🎨 Interface Web

### Pages disponibles
1. **Connexion** : `/login.html`
2. **Libre Pratique** : `/libre-pratique.html`
3. **Transit** : `/transit.html`

### Comptes de démonstration
```
admin / admin123 (Tous workflows)
douane / douane2025 (Tous workflows)
lp_user / lp123 (Libre pratique)
transit_user / transit123 (Transit)
```

### Fonctionnalités Interface Libre Pratique
- ✅ Création manifestes format UEMOA avec formulaire interactif
- ✅ Gestion multi-articles et conteneurs
- ✅ **Section dédiée manifestes à apurer** (Étape 17 reçue)
- ✅ **Interface apurement manuelle** (Étapes 18-19) avec :
  - Consultation informations déclaration/paiement
  - Saisie agent confirmant l'apurement
  - Observations facultatives
  - Validation et génération Bon à Enlever
- ✅ Suivi workflow temps réel
- ✅ Monitoring Kit MuleSoft

### Fonctionnalités Interface Transit
- ✅ Création déclarations transit avec formulaire
- ✅ Gestion marchandises et garanties
- ✅ **Section dédiée transits à apurer** (Étape 14 reçue)
- ✅ **Interface apurement manuelle** (Étapes 15-16) avec :
  - Consultation message arrivée
  - Vérification conformité itinéraire/délais
  - Saisie agent confirmant l'apurement
  - Observations facultatives
  - Libération automatique garanties
- ✅ Suivi workflow temps réel
- ✅ Monitoring Kit MuleSoft

---

## 📈 Statuts du Workflow

### Libre Pratique

| Statut | Étapes | Description |
|--------|--------|-------------|
| `MANIFESTE_CREE` | 1-3 | Créé au Port de Dakar |
| `TRANSMIS_VERS_DESTINATION` | 1-5 | Envoyé au Mali via Kit |
| `DECLARATION_RECUE` | 1-5, 17 | Info paiement reçue - **Prêt apurement** |
| `APURE` | 1-5, 17-18 | Apurement confirmé manuellement |
| `MAINLEVEE_ATTRIBUEE` | 1-5, 17-19 | Bon à enlever émis ✅ |

### Transit

| Statut | Étapes | Description |
|--------|--------|-------------|
| `TRANSIT_CREE` | 1-9 | Créé au Port de Dakar avec garanties |
| `COPIE_TRANSMISE` | 1-11 | Copie envoyée au Mali via Kit |
| `ARRIVEE_CONFIRMEE` | 1-11, 14 | Message arrivée reçu - **Prêt apurement** |
| `TRANSIT_APURE` | 1-16 | Apurement confirmé + garanties libérées ✅ |

---

## 🔗 Architecture d'Interconnexion

```
Port de Dakar (Sénégal)
    ↓ ÉTAPES 1-5 (Libre Pratique) ou 1-11 (Transit)
Kit MuleSoft (http://64.225.5.75:8086)
    ↓ Routage
Mali/Burkina/Niger (Destination)
    ↓ ÉTAPES 6-16 (Libre Pratique) ou 13-14 (Transit)
Kit MuleSoft
    ↓ ÉTAPE 17 (Libre Pratique) ou 14 (Transit)
Port de Dakar
    ↓ ÉTAPES 18-19 (Libre Pratique) ou 15-16 (Transit)
    👤 ACTION MANUELLE AGENT DOUANIER
✅ Workflow Terminé
```

---

## 🔧 Configuration

### Variables d'environnement
```env
PORT=3001
KIT_MULESOFT_URL=http://64.225.5.75:8086/api/v1
PAYS_CODE=SEN
PORT_NAME=Port de Dakar
PAYS_ROLE=PAYS_PRIME_ABORD
```

### Structure du Projet
```
simulateur-senegal/
├── api/
│   ├── auth/                          # Authentification
│   │   ├── login.js
│   │   ├── logout.js
│   │   └── verify.js
│   ├── health.js                      # Health check
│   ├── statistiques.js                # Stats supervision
│   ├── manifeste/                     # Workflow Libre Pratique
│   │   ├── creer.js                   # ÉTAPES 1-5
│   │   └── lister.js
│   ├── mainlevee/
│   │   └── autorisation.js            # ÉTAPE 17 (auto)
│   ├── apurement/
│   │   └── traiter.js                 # ÉTAPES 18-19 (manuel)
│   ├── transit/                       # Workflow Transit
│   │   ├── creer.js                   # ÉTAPES 1-11
│   │   ├── arrivee.js                 # ÉTAPE 14 (auto)
│   │   ├── apurer.js                  # ÉTAPES 15-16 (manuel)
│   │   └── lister.js
│   └── kit/
│       └── test.js                    # Tests Kit MuleSoft
├── lib/
│   ├── database.js                    # Base données Sénégal
│   └── kit-client.js                  # Client Kit MuleSoft
├── public/
│   ├── index.html                     # Page d'accueil
│   ├── login.html                     # Authentification
│   ├── libre-pratique.html            # Dashboard Libre Pratique
│   ├── transit.html                   # Dashboard Transit
│   ├── auth.js                        # Script auth client
│   ├── script.js                      # Logique frontend
│   └── style.css
├── server.js                          # Serveur HTTP
├── package.json
└── README.md
```

---

## 🆘 Support

**Développé par** : Cabinet Jasmine Conseil  
**Conformité** : Rapport PDF UEMOA - Interconnexion SI Douaniers  
**Version** : 1.0.0-UEMOA  
**Runtime** : Node.js 22.x

**Contact** : douanes.dakar@gouv.sn

---

## 🔑 Points Clés - Actions Manuelles

### Workflow Libre Pratique
- ✅ **Étapes 1-5** : Automatiques via formulaire web
- ✅ **Étape 17** : Automatique depuis Kit MuleSoft
- 👤 **Étapes 18-19** : **MANUELLES** - Agent douanier confirme apurement et délivre BAE

### Workflow Transit
- ✅ **Étapes 1-11** : Automatiques via formulaire web
- ✅ **Étape 14** : Automatique depuis Kit MuleSoft
- 👤 **Étapes 15-16** : **MANUELLES** - Agent douanier apure transit et libère garanties

**Justification des actions manuelles :**
- Vérification humaine des documents et paiements
- Validation conformité réglementaire
- Décision finale sur libération marchandises/garanties
- Traçabilité et responsabilité administrative

---

## 📄 Licence

© 2025 Cabinet Jasmine Conseil - Tous droits réservés

*Simulateur Sénégal - Port de Dakar - Pays de Prime Abord UEMOA*
