# 🇸🇳 Simulateur Système Douanier Sénégal - Port de Dakar

**Pays de Prime Abord** - Implémentation conforme au rapport PDF UEMOA  
Simulation complète des workflows Libre Pratique (21 étapes) et Transit (16 étapes)

---

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Démarrage rapide](#-démarrage-rapide)
- [Workflows implémentés](#-workflows-implémentés)
- [Services et APIs](#-services-et-apis)
- [Base de données](#-base-de-données)
- [Kit MuleSoft Integration](#-kit-mulesoft-integration)
- [Interface utilisateur](#-interface-utilisateur)
- [Configuration](#-configuration)
- [Tests et validation](#-tests-et-validation)
- [Déploiement](#-déploiement)
- [Support](#-support)

---

## 📋 Vue d'ensemble

Ce simulateur implémente le système douanier du **Sénégal (Pays A)** selon l'architecture d'interconnexion UEMOA définie dans le rapport PDF. En tant que **pays de prime abord**, le Sénégal gère l'arrivée des marchandises au **Port de Dakar** et assure leur traitement selon les workflows réglementaires.

### 🎯 Rôle dans l'écosystème UEMOA

- **Pays A** : Sénégal (Dakar) - Pays de prime abord côtier
- **Port principal** : Port de Dakar (Code bureau: 18N)
- **Fonction** : Point d'entrée des marchandises dans l'espace UEMOA
- **Interconnexion** : Sénégal ↔ Kit MuleSoft ↔ Mali (Pays B) ↔ Commission UEMOA
- **Format** : UEMOA 2025.1 natif pour tous les échanges

### 🌍 Caractéristiques du Sénégal

| Propriété | Valeur |
|-----------|--------|
| Code pays | SEN |
| Nom | Sénégal |
| Ville principale | Dakar |
| Type de pays | COTIER |
| Rôle UEMOA | PAYS_PRIME_ABORD |
| Port principal | Port de Dakar |
| Bureau douanier | 18N |
| Code CGT | 014 |

---

## 🏗️ Architecture

### Structure du projet

```
simulateur-senegal/
├── api/                              # 🔥 APIs REST du simulateur
│   ├── health.js                     # ❤️ Health check système
│   ├── statistiques.js               # 📊 Métriques et performance
│   │
│   ├── manifeste/                    # 📦 Gestion des manifestes
│   │   ├── creer.js                  # ÉTAPES 1-5: Création + transmission
│   │   └── lister.js                 # Liste et filtrage manifestes
│   │
│   ├── mainlevee/                    # 🔓 Gestion autorisations
│   │   └── autorisation.js           # ÉTAPE 17: Réception autorisation
│   │
│   ├── apurement/                    # ✅ Gestion apurement/levée
│   │   └── traiter.js                # ÉTAPES 18-19: Apurement + BAE
│   │
│   └── kit/                          # 🔗 Tests Kit MuleSoft
│       └── test.js                   # Tests connectivité Kit
│
├── lib/                              # 📚 Librairies métier
│   ├── database.js                   # 💾 Base de données embarquée
│   └── kit-client.js                 # 🔌 Client Kit MuleSoft
│
├── public/                           # 🎨 Interface web
│   ├── index.html                    # 📱 Dashboard interactif
│   ├── script.js                     # ⚡ JavaScript frontend
│   └── style.css                     # 🎨 Styles CSS
│
├── server.js                         # 🚀 Serveur HTTP principal
├── package.json                      # 📦 Configuration npm
├── vercel.json                       # ☁️ Configuration Vercel
├── .gitignore                        # 🚫 Fichiers ignorés
└── README.md                         # 📖 Documentation
```

### Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                    PORT DE DAKAR (SÉNÉGAL)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ÉTAPES 1-3: Création Manifeste                            │
│  ┌──────────────────────────────────────────────┐          │
│  │ Consignataire → Formulaire UEMOA →           │          │
│  │ Validation → Stockage BDD locale             │          │
│  └──────────────────────────────────────────────┘          │
│                          ↓                                   │
│  ÉTAPES 4-5: Transmission Kit                              │
│  ┌──────────────────────────────────────────────┐          │
│  │ Extraction marchandises →                     │          │
│  │ Envoi Kit MuleSoft → Routage vers Mali       │          │
│  └──────────────────────────────────────────────┘          │
│                          ↓                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   KIT MULESOFT        │
              │   (Interconnexion)    │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   MALI (Bamako)       │
              │   Pays B Destination  │
              │   Étapes 6-16         │
              └───────────┬───────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    PORT DE DAKAR (SÉNÉGAL)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ÉTAPE 17: Réception Déclaration                           │
│  ┌──────────────────────────────────────────────┐          │
│  │ Kit MuleSoft → Infos recouvrement →          │          │
│  │ Enregistrement BDD → Statut MAJ              │          │
│  └──────────────────────────────────────────────┘          │
│                          ↓                                   │
│  ÉTAPES 18-19: Apurement + Levée                           │
│  ┌──────────────────────────────────────────────┐          │
│  │ Agent douanes → Confirmation →                │          │
│  │ Apurement → Bon à enlever (BAE)              │          │
│  └──────────────────────────────────────────────┘          │
│                          ↓                                   │
│  🎉 WORKFLOW TERMINÉ - Marchandises libérées               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** : Version 22.x ou supérieure
- **npm** : Gestionnaire de paquets Node.js
- **Port** : 3001 (configurable)

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd simulateur-senegal

# Installer les dépendances
npm install

# Vérifier l'installation
node --version  # Doit afficher v22.x ou supérieur
```

### Lancement

```bash
# Option 1: Script npm (recommandé)
npm start

# Option 2: Node.js direct
node server.js

# Option 3: Mode développement
npm run dev
```

### URLs disponibles

Une fois démarré, le simulateur est accessible via:

| Service | URL | Description |
|---------|-----|-------------|
| 🖥️ **Dashboard** | http://localhost:3001 | Interface web principale |
| 🏥 **Health** | http://localhost:3001/api/health | Vérification état système |
| 📊 **Statistiques** | http://localhost:3001/api/statistiques | Métriques et performance |
| 📋 **Manifestes** | http://localhost:3001/api/manifeste/lister | Liste des manifestes |
| 🔓 **Apurement** | http://localhost:3001/api/apurement/traiter | Interface apurement |

### Vérification

```bash
# Test health check
curl http://localhost:3001/api/health

# Réponse attendue:
{
  "service": "Système Douanier Sénégal (Port de Dakar)",
  "status": "UP",
  "pays": {
    "code": "SEN",
    "nom": "Sénégal",
    "role": "PAYS_PRIME_ABORD"
  }
}
```

---

## 🔥 Workflows implémentés

### 📦 Workflow Libre Pratique (21 étapes)

Le workflow libre pratique permet le dédouanement des marchandises à destination d'un pays enclavé de l'UEMOA. Le Sénégal implémente les étapes de début et de fin du processus.

#### ÉTAPES 1-3 : Création et enregistrement manifeste

**Responsable** : Consignataire au Port de Dakar  
**Lieu** : Port de Dakar, Sénégal  
**Format** : UEMOA 2025.1

**Processus détaillé** :

1. **ÉTAPE 1** : Téléchargement du manifeste d'entrée
   - Le consignataire accède au système douanier
   - Renseigne les informations du navire et de la cargaison
   - Format UEMOA avec tous les champs obligatoires

2. **ÉTAPE 2** : Renseignement des informations marchandise
   - Pour chaque article: description, poids, destination
   - Informations conteneurs (numéros, plombs, types)
   - Pays de destination finale (Mali, Burkina Faso, etc.)

3. **ÉTAPE 3** : Enregistrement dans la base locale
   - Validation des données saisies
   - Attribution ID manifeste unique
   - Stockage dans base de données Port de Dakar
   - Statut: `MANIFESTE_CREE`

**Code d'exemple** :
```javascript
// POST /api/manifeste/creer
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
    "marchandise": "Véhicule Toyota",
    "poids": 1500,
    "destinataire": "IMPORT SARL BAMAKO"
  }]
}
```

#### ÉTAPES 4-5 : Transmission vers Kit d'Interconnexion

**Responsable** : Système automatisé Sénégal  
**Destination** : Kit MuleSoft → Mali  
**Format** : Extraction UEMOA

**Processus détaillé** :

4. **ÉTAPE 4** : Transmission automatique vers Kit
   - Extraction des articles destinés au Mali
   - Préparation du message au format UEMOA
   - Envoi HTTP POST vers Kit MuleSoft
   - Headers spécifiques (X-Source-Country: SEN)

5. **ÉTAPE 5** : Extraction transmise vers destination
   - Kit MuleSoft reçoit l'extraction
   - Routage vers le système douanier Mali
   - Confirmation de réception
   - Statut: `TRANSMIS_VERS_DESTINATION`

**Flux technique** :
```javascript
// Le Sénégal envoie au Kit
POST http://localhost:8080/api/v1/manifeste/transmission
Headers:
  X-Source-Country: SEN
  X-Source-System: SENEGAL_DOUANES_DAKAR
  X-Manifeste-Format: UEMOA

// Le Kit route vers le Mali
// (Étapes 6-16 traitées par le Mali)
```

#### ÉTAPES 6-16 : Traitement par le pays de destination

**Responsable** : Mali (Bamako)  
**Non implémenté dans ce simulateur**

Ces étapes incluent :
- Réception de l'extraction manifeste
- Création de la déclaration en détail
- Liquidation des droits et taxes
- Paiement et recouvrement
- Validation de la déclaration

#### ÉTAPE 17 : Réception informations déclaration/recouvrement

**Responsable** : Kit MuleSoft → Sénégal  
**Lieu** : Port de Dakar  
**Trigger** : Après paiement au Mali

**Processus détaillé** :

17. **Réception des informations de déclaration**
    - Le Mali envoie les infos via Kit MuleSoft
    - Le Sénégal reçoit: montant payé, référence paiement
    - Enregistrement dans la base locale
    - Statut: `DECLARATION_RECUE`

**Payload reçu** :
```javascript
// POST /api/mainlevee/autorisation
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

// Headers requis:
X-Correlation-ID: MLI_SEN_2025_001
X-Authorization-Source: KIT_MULESOFT
X-Source-Country: MLI
X-Payment-Reference: PAY-MLI-2025-001
```

#### ÉTAPES 18-19 : Apurement et attribution main levée

**Responsable** : Agent douanes Port de Dakar  
**Lieu** : Bureau douanes principal  
**Résultat** : Bon à enlever (BAE)

**Processus détaillé** :

18. **ÉTAPE 18 : Apurement du manifeste**
    - Agent douanes vérifie le dossier complet
    - Confirmation du paiement au Mali
    - Validation de la conformité documentaire
    - Enregistrement de l'apurement
    - Statut: `APURE`

19. **ÉTAPE 19 : Attribution main levée**
    - Génération du Bon à Enlever (BAE)
    - Attribution numéro BAE unique
    - Instructions d'enlèvement
    - Notification au consignataire
    - Statut: `MAINLEVEE_ATTRIBUEE`

**Interface apurement** :
```javascript
// GET /api/apurement/traiter?numeroManifeste=5016&referencePaiement=PAY-MLI-001
// Récupère les infos pour affichage

// POST /api/apurement/traiter
{
  "numeroManifeste": "5016",
  "referencePaiement": "PAY-MLI-2025-001",
  "typeConfirmation": "DOUANE",
  "agentConfirmation": "AGENT_DOUANES_DAKAR",
  "observations": "Apurement conforme règlement UEMOA"
}

// Réponse:
{
  "status": "SUCCESS",
  "message": "Workflow Sénégal terminé",
  "apurement": {
    "id": "APU_SEN_1736936400000",
    "dateApurement": "2025-01-15T16:00:00Z",
    "agentConfirmation": "AGENT_DOUANES_DAKAR"
  },
  "bonEnlever": {
    "id": "BAE_SEN_1736936400001",
    "portEnlevement": "Port de Dakar",
    "instructions": ["Marchandises autorisées...", ...]
  }
}
```

#### ÉTAPES 20-21 : Finalisation (non implémentées)

**Responsable** : Consignataire + Commission UEMOA

20. Délivrance effective des marchandises
21. Mise en libre circulation dans l'Union

---

### 🚛 Workflow Transit (16 étapes)

Le workflow transit gère le passage de marchandises à travers le territoire sénégalais.

#### ÉTAPES 1-6 : Création déclaration transit au départ

**Processus** :
- Arrivée marchandises au Port de Dakar
- Dépôt déclaration transit vers pays enclavé
- Vérification recevabilité
- Enregistrement de la déclaration
- Apurement droits de transit
- Vérification documentaire

#### ÉTAPE 14 : Réception message arrivée destination

- Le pays de destination confirme l'arrivée
- Envoi message via Kit MuleSoft
- Enregistrement au Sénégal

#### ÉTAPES 15-16 : Apurement transit

- Confirmation itinéraire respecté
- Clôture du dossier transit
- Libération des garanties

---

## 🎯 Services et APIs

### Service 1: Health Check

**Endpoint** : `GET /api/health`  
**Fonction** : Vérification état système et connectivité  
**Timeout** : 30 secondes

**Contrôles effectués** :
- ✅ Service Sénégal opérationnel
- ✅ Kit MuleSoft accessible
- ✅ Base de données fonctionnelle
- ✅ Workflow 21 étapes supporté
- ✅ Format UEMOA validé

**Réponse type** :
```json
{
  "service": "Système Douanier Sénégal (Port de Dakar)",
  "status": "UP",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z",
  
  "pays": {
    "code": "SEN",
    "nom": "Sénégal",
    "ville": "Dakar",
    "type": "COTIER",
    "role": "PAYS_PRIME_ABORD"
  },
  
  "port": {
    "nom": "Port de Dakar",
    "type": "PORT_COMMERCIAL",
    "fonction": "DEBARQUEMENT_MARCHANDISES"
  },
  
  "fonctionnalites": {
    "creationManifeste": "ACTIF",
    "transmissionKit": "ACTIF",
    "receptionDeclaration": "ACTIF",
    "apurementMainlevee": "ACTIF"
  },
  
  "workflow": {
    "libre_pratique": {
      "etapes_senegal": "1-5, 17-19",
      "description": "Création, transmission, réception, apurement"
    }
  },
  
  "kit": {
    "url": "http://localhost:8080/api/v1",
    "status": "UP",
    "accessible": true,
    "latence": 150
  }
}
```

**États possibles** :
- `UP` : Système opérationnel
- `DEGRADED` : Kit MuleSoft inaccessible
- `DOWN` : Service hors ligne

---

### Service 2: Statistiques

**Endpoint** : `GET /api/statistiques`  
**Fonction** : Métriques système et workflow  
**Refresh** : 10 secondes

**Métriques collectées** :
- Volume manifestes créés
- Transmissions Kit MuleSoft
- Taux de réussite transmissions
- Apurements traités
- Latence moyenne Kit
- Progression workflow (étapes)

**Réponse détaillée** :
```json
{
  "status": "SUCCESS",
  "paysTraitement": {
    "code": "SEN",
    "nom": "Sénégal",
    "role": "PAYS_PRIME_ABORD",
    "port": "Port de Dakar"
  },
  
  "statistiques": {
    "manifestesCreees": 15,
    "transmissionsKit": 12,
    "transmissionsReussies": 10,
    "autorisationsRecues": 8,
    "apurementsTraites": 5,
    "transitsCrees": 3,
    "erreurs": 2,
    "derniereMiseAJour": "2025-01-15T10:30:00Z",
    
    "performance": {
      "tauxReussiteGlobal": 83,
      "latenceMoyenne": 1200,
      "volumeTraiteToday": 5,
      "tauxCompletionWorkflow": 33
    }
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
  },
  
  "kit": {
    "status": "UP",
    "accessible": true,
    "latence": 150,
    "connectivity": "CONNECTED"
  }
}
```

---

### Service 3: Création Manifeste (ÉTAPES 1-5)

**Endpoint** : `POST /api/manifeste/creer`  
**Fonction** : Workflow complet création + transmission  
**Timeout** : 90 secondes

**Headers requis** :
```http
Content-Type: application/json
X-Source-Country: SEN
X-Source-System: SENEGAL_DOUANES_FRONTEND
```

**Payload UEMOA complet** :
```json
{
  "annee_manif": "2025",
  "bureau_manif": "18N",
  "numero_manif": 5016,
  "code_cgt": "014",
  "consignataire": "MAERSK LINE SENEGAL",
  "repertoire": "02402",
  
  "navire": "MARCO POLO",
  "provenance": "ROTTERDAM",
  "pavillon": "LIBÉRIA",
  "date_arrivee": "2025-01-15",
  "valapprox": 150000,
  
  "nbre_article": 1,
  "articles": [{
    "art": 1,
    "prec1": 0,
    "prec2": 0,
    "date_emb": "2025-01-10",
    "lieu_emb": "ROTTERDAM",
    "pays_dest": "MALI",
    "ville_dest": "BAMAKO",
    "connaissement": "233698813",
    "expediteur": "EXPORT CORP ROTTERDAM",
    "destinataire": "IMPORT SARL BAMAKO",
    "voie_dest": "ROUTIER",
    "ordre": "",
    "marchandise": "Véhicule particulier Toyota Corolla",
    "poids": 1500,
    "nbre_colis": 1,
    "marque": "NM",
    "mode_cond": "COLIS (PACKAGE)",
    "nbre_conteneur": 1,
    "conteneurs": [{
      "conteneur": "TCLU1234567",
      "type": "DRS",
      "taille": "40",
      "plomb": "SN123456"
    }]
  }]
}
```

**Traitement automatique** :

1. **Validation** format UEMOA Sénégal
   - Champs obligatoires présents
   - Format dates valide
   - Pays destination dans UEMOA
   - Conteneurs bien renseignés

2. **Stockage** dans base locale
   - Attribution ID unique
   - Horodatage création
   - Statut initial: `MANIFESTE_CREE`

3. **Transmission** vers Kit MuleSoft
   - Extraction articles destination
   - Envoi HTTP POST
   - Gestion retry si échec
   - Timeout 90 secondes

4. **Routage** vers Mali
   - Kit route vers système Mali
   - Confirmation réception
   - Corrélation ID tracking

5. **Notification** workflow
   - Mise à jour statut
   - Log interactions
   - Notification agent

**Réponse succès** :
```json
{
  "status": "SUCCESS",
  "message": "Manifeste créé et extraction transmise",
  
  "paysTraitement": {
    "code": "SEN",
    "nom": "Sénégal",
    "port": "Port de Dakar",
    "role": "PAYS_PRIME_ABORD"
  },
  
  "manifeste": {
    "id": "SEN_5016_2025",
    "numero_manif": 5016,
    "consignataire": "MAERSK LINE SENEGAL",
    "statut": "TRANSMIS_VERS_DESTINATION",
    "etapeWorkflow": "TRANSMISSION_KIT",
    "dateCreation": "2025-01-15T10:00:00Z"
  },
  
  "workflow": {
    "etapesCompletes": "1-5",
    "prochaine_etape": "Attente déclaration Mali (6-16)",
    "statut_workflow": "TRANSMISSION_KIT"
  },
  
  "transmissionKit": {
    "reussie": true,
    "latence": 1200,
    "correlationId": "SEN_1736936400000_xyz",
    "prochaine_etape": "Routage vers Mali par Kit"
  }
}
```

**Réponse échec partiel** :
```json
{
  "status": "PARTIAL_SUCCESS",
  "message": "Manifeste créé, erreur transmission Kit",
  
  "manifeste": {
    "id": "SEN_5016_2025",
    "statut": "ERREUR_TRANSMISSION"
  },
  
  "transmissionKit": {
    "reussie": false,
    "erreur": "Timeout Kit MuleSoft",
    "retryRecommended": true
  }
}
```

---

### Service 4: Liste Manifestes

**Endpoint** : `GET /api/manifeste/lister`  
**Fonction** : Liste et filtrage manifestes  
**Paramètres** : Query string

**Paramètres disponibles** :
- `limite` : Nombre max (défaut: 20, max: 100)
- `statut` : Filtre par statut
- `paysDestination` : Filtre par pays
- `etapeWorkflow` : Filtre par étape

**Exemples d'utilisation** :
```bash
# Tous les manifestes
GET /api/manifeste/lister

# Limiter à 10
GET /api/manifeste/lister?limite=10

# Seulement ceux transmis
GET /api/manifeste/lister?statut=TRANSMIS_VERS_DESTINATION

# Destination Mali
GET /api/manifeste/lister?paysDestination=MALI

# Prêts pour apurement
GET /api/manifeste/lister?statut=DECLARATION_RECUE
```

**Statuts possibles** :
- `MANIFESTE_CREE` : Étapes 1-3 terminées
- `TRANSMIS_VERS_DESTINATION` : Étapes 4-5 terminées
- `ERREUR_TRANSMISSION` : Échec transmission Kit
- `DECLARATION_RECUE` : Étape 17 terminée
- `APURE` : Étape 18 terminée
- `MAINLEVEE_ATTRIBUEE` : Étape 19 terminée

**Réponse type** :
```json
{
  "status": "SUCCESS",
  "message": "Liste de 5 manifeste(s)",
  
  "paysTraitement": {
    "code": "SEN",
    "nom": "Sénégal",
    "port": "Port de Dakar"
  },
  
  "manifestes": [{
    "id": "SEN_5016_2025",
    "numero_manif": 5016,
    "consignataire": "MAERSK LINE SENEGAL",
    "navire": "MARCO POLO",
    "statut": "DECLARATION_RECUE",
    "etapeWorkflow": "DECLARATION_RECUE",
    
    "marchandises": {
      "nombre": 1,
      "paysDestinations": ["MALI"],
      "poidsTotal": 1500,
      "format": "UEMOA"
    },
    
    "transmission": {
      "statut": "TRANSMIS_KIT",
      "reussie": true,
      "dateTransmission": "2025-01-15T10:01:00Z"
    },
    
    "declaration": {
      "reçue": true,
      "montantAcquitte": 250000,
      "paysDeclarant": "MLI",
      "dateReception": "2025-01-15T14:30:00Z"
    },
    
    "progressionWorkflow": {
      "etapesCompletes": "1-5, 17",
      "etapeActuelle": 17,
      "prochaine_etape": "18: Apurement"
    }
  }],
  
  "statistiques": {
    "total": 5,
    "parStatut": {
      "DECLARATION_RECUE": 2,
      "TRANSMIS_VERS_DESTINATION": 2,
      "APURE": 1
    },
    "workflow": {
      "etape_1_3": 5,
      "etape_4_5": 4,
      "etape_17": 2,
      "etape_18": 1
    }
  }
}
```

---

### Service 5: Autorisation Mainlevée (ÉTAPE 17)

**Endpoint** : `POST /api/mainlevee/autorisation`  
**Fonction** : Réception infos déclaration depuis Mali  
**Appelé par** : Kit MuleSoft

**Headers spéciaux** :
```http
X-Correlation-ID: MLI_SEN_2025_001
X-Authorization-Source: KIT_MULESOFT
X-Source-Country: MLI
X-Payment-Reference: PAY-MLI-2025-001
```

**Payload reçu du Kit** :
```json
{
  "autorisationMainlevee": {
    "numeroManifeste": "5016",
    "referenceDeclaration": "DEC-MLI-2025-001",
    "montantAcquitte": 250000,
    "monnaie": "FCFA",
    "paysDeclarant": "MLI",
    "referencePaiement": "PAY-MLI-2025-001",
    "datePaiement": "2025-01-15T14:30:00Z",
    "methodePaiement": "BANCAIRE"
  }
}
```

**Traitement** :

1. Vérification manifeste existe au Port de Dakar
2. Enregistrement informations Mali
3. Mise à jour statut → `DECLARATION_RECUE`
4. Préparation pour apurement
5. Notification workflow

**Réponse** :
```json
{
  "status": "SUCCESS",
  "message": "ÉTAPE 17 SÉNÉGAL TERMINÉE",
  
  "workflow": {
    "etapeComplétée": 17,
    "etapeDescription": "Réception infos déclaration/recouvrement",
    "prochaine_etape": "18-19: Apurement et main levée",
    "statusWorkflow": "DECLARATION_RECUE"
  },
  
  "informationsReçues": {
    "id": "DEC_REC_SEN_1736940600000",
    "numeroManifeste": "5016",
    "montantAcquitte": 250000,
    "monnaie": "FCFA",
    "paysDeclarant": "MLI",
    "referencePaiement": "PAY-MLI-2025-001"
  },
  
  "manifeste": {
    "statutActuel": "DECLARATION_RECUE",
    "peutEtreApure": true
  },
  
  "instructions": [
    "✅ ÉTAPE 17 terminée",
    "📦 Manifeste prêt pour apurement",
    "👤 Agent douanes peut procéder",
    "💰 Montant confirmé: 250000 FCFA"
  ]
}
```

**Endpoint GET pour liste** :
```bash
GET /api/mainlevee/autorisation

# Liste toutes les autorisations reçues
```

---

### Service 6: Apurement et Levée (ÉTAPES 18-19)

**Endpoint** : `GET|POST /api/apurement/traiter`  
**Fonction** : Workflow apurement complet  
**Responsable** : Agent douanes Dakar

#### GET - Récupération infos

```bash
GET /api/apurement/traiter?numeroManifeste=5016&referencePaiement=PAY-MLI-001
```

**Réponse** :
```json
{
  "status": "SUCCESS",
  "message": "Informations apurement récupérées",
  
  "data": {
    "manifeste": {
      "numero": 5016,
      "consignataire": "MAERSK LINE SENEGAL",
      "navire": "MARCO POLO",
      "statut": "DECLARATION_RECUE"
    },
    
    "autorisation": {
      "montant": 250000,
      "paysDeclarant": "MLI",
      "dateReception": "2025-01-15T14:30:00Z"
    },
    
    "peutEtreApure": true,
    
    "workflow": {
      "etapesCompletes": "1-17",
      "prochaine_etape": "ÉTAPE 18: Apurement"
    }
  }
}
```

#### POST - Confirmation apurement

```json
POST /api/apurement/traiter

{
  "numeroManifeste": "5016",
  "referencePaiement": "PAY-MLI-2025-001",
  "typeConfirmation": "DOUANE",
  "agentConfirmation": "AGENT_DOUANES_DAKAR",
  "observations": "Apurement conforme UEMOA"
}
```

**Traitement ÉTAPE 18-19** :

1. **ÉTAPE 18 : Apurement**
   - Vérification dossier complet
   - Confirmation par agent
   - Enregistrement apurement
   - Génération ID apurement

2. **ÉTAPE 19 : Main levée**
   - Création Bon à Enlever (BAE)
   - Attribution numéro BAE
   - Instructions enlèvement
   - Notification consignataire

3. **Notification Kit** (optionnel)
   - Envoi notification apurement
   - Confirmation workflow terminé

**Réponse complète** :
```json
{
  "status": "SUCCESS",
  "message": "WORKFLOW SÉNÉGAL TERMINÉ",
  
  "workflow": {
    "status": "TERMINE",
    "etapesCompletes": "1-19 (sur 21)",
    "etapesRestantes": "20-21 (circulation libre)",
    "dureeTotal": "360 minutes"
  },
  
  "apurement": {
    "id": "APU_SEN_1736944200000",
    "numeroManifeste": "5016",
    "dateApurement": "2025-01-15T16:00:00Z",
    "agentConfirmation": "AGENT_DOUANES_DAKAR",
    "typeConfirmation": "DOUANE",
    "statutApurement": "CONFIRME",
    "etapeWorkflow": 18
  },
  
  "bonEnlever": {
    "id": "BAE_SEN_1736944200001",
    "manifesteId": "SEN_5016_2025",
    "numeroManifeste": "5016",
    "dateMainlevee": "2025-01-15T16:01:00Z",
    "portEnlevement": "Port de Dakar",
    "agentMainlevee": "AGENT_DOUANES_DAKAR",
    "referencePaiement": "PAY-MLI-2025-001",
    "etapeWorkflow": 19,
    "instructions": [
      "Marchandises autorisées à l'enlèvement",
      "Port d'enlèvement: Port de Dakar",
      "Présentez ce bon au service des sorties",
      "Vérification documentaire requise"
    ]
  },
  
  "manifeste": {
    "statutFinal": "MAINLEVEE_ATTRIBUEE",
    "peutEtreEnleve": true,
    "workflowTermine": true
  },
  
  "notificationKit": {
    "success": true,
    "message": "Kit MuleSoft notifié"
  },
  
  "instructions": [
    "✅ ÉTAPE 18: Apurement confirmé",
    "✅ ÉTAPE 19: Bon à enlever attribué",
    "📦 Marchandises peuvent être enlevées",
    "🏁 Workflow Sénégal terminé",
    "📋 Manifeste clôturé"
  ],
  
  "contact": {
    "bureau": "Bureau Principal Douanes Dakar",
    "port": "Port de Dakar",
    "telephone": "+221-XX-XX-XX-XX"
  }
}
```

---

### Service 7: Test Kit MuleSoft

**Endpoint** : `GET /api/kit/test`  
**Fonction** : Tests connectivité Kit  
**Paramètres** : `type` (query)

**Types de tests** :
- `health` : Test santé basique
- `diagnostic` : Diagnostic complet
- `ping` : Test latence

**Exemples** :
```bash
# Test santé
GET /api/kit/test?type=health

# Diagnostic
GET /api/kit/test?type=diagnostic

# Ping
GET /api/kit/test?type=ping
```

**Réponse health** :
```json
{
  "status": "SUCCESS",
  "message": "Test Kit health réussi",
  "resultat": {
    "status": "UP",
    "accessible": true,
    "latence": 150,
    "timestamp": "2025-01-15T10:00:00Z"
  },
  "source": "PROXY_SERVEUR"
}
```

---

## 💾 Base de données

### Modèle de données

La base de données embarquée (`lib/database.js`) stocke toutes les informations du workflow.

#### Structure Manifeste

```javascript
const manifeste = {
  // Identifiants
  id: "SEN_5016_2025",
  numero_manif: 5016,
  annee_manif: "2025",
  bureau_manif: "18N",
  
  // Format
  format: "UEMOA",
  
  // Transport
  consignataire: "MAERSK LINE SENEGAL",
  navire: "MARCO POLO",
  provenance: "ROTTERDAM",
  pavillon: "LIBÉRIA",
  date_arrivee: "2025-01-15",
  
  // Localisation
  paysOrigine: "SEN",
  portDebarquement: "Port de Dakar",
  
  // Workflow
  statut: "MANIFESTE_CREE",
  etapeWorkflow: "CREATION_MANIFESTE",
  dateCreation: "2025-01-15T10:00:00Z",
  
  // Tracking 21 étapes
  workflow: {
    etape1_manifesteRecu: "2025-01-15T10:00:00Z",
    etape2_informationsEnregistrees: "2025-01-15T10:00:01Z",
    etape3_stockageLocal: "2025-01-15T10:00:02Z",
    etape4_transmissionKit: null,
    etape5_extractionTransmise: null,
    etape17_declarationRecue: null,
    etape18_apurement: null,
    etape19_mainlevee: null
  },
  
  // Articles
  nbre_article: 1,
  articles: [{
    art: 1,
    prec1: 0,
    prec2: 0,
    date_emb: "2025-01-10",
    lieu_emb: "ROTTERDAM",
    pays_dest: "MALI",
    ville_dest: "BAMAKO",
    connaissement: "233698813",
    expediteur: "EXPORT CORP",
    destinataire: "IMPORT SARL BAMAKO",
    marchandise: "Véhicule Toyota",
    poids: 1500,
    nbre_colis: 1,
    marque: "NM",
    mode_cond: "COLIS (PACKAGE)",
    nbre_conteneur: 1,
    conteneurs: [{
      conteneur: "TCLU1234567",
      type: "DRS",
      taille: "40",
      plomb: "SN123456"
    }]
  }],
  
  // Transmission Kit
  transmissionKit: {
    dateTransmission: "2025-01-15T10:01:00Z",
    statut: "TRANSMIS_KIT",
    latence: 1200,
    reponseKit: {...}
  },
  
  // Informations déclaration (ÉTAPE 17)
  informationsDeclaration: {
    id: "DEC_REC_SEN_...",
    referenceDeclaration: "DEC-MLI-2025-001",
    montantAcquitte: 250000,
    paysDeclarant: "MLI",
    referencePaiement: "PAY-MLI-2025-001",
    dateReception: "2025-01-15T14:30:00Z"
  },
  
  // Apurement (ÉTAPE 18)
  apurement: {
    id: "APU_SEN_...",
    dateApurement: "2025-01-15T16:00:00Z",
    agentConfirmation: "AGENT_DOUANES_DAKAR",
    typeConfirmation: "DOUANE",
    statutApurement: "CONFIRME"
  },
  
  // Bon à enlever (ÉTAPE 19)
  bonEnlever: {
    id: "BAE_SEN_...",
    dateMainlevee: "2025-01-15T16:01:00Z",
    portEnlevement: "Port de Dakar",
    instructions: [...]
  }
};
```

### Méthodes disponibles

```javascript
// Création manifeste (ÉTAPES 1-3)
database.creerManifeste(donneesManifeste)

// Transmission Kit (ÉTAPE 4-5)
database.enregistrerTransmissionKit(manifesteId, reponseKit, succes)

// Réception déclaration (ÉTAPE 17)
database.recevoirInformationsDeclaration(donneesDeclaration)

// Apurement (ÉTAPE 18)
database.traiterApurement(donneesApurement)

// Main levée (ÉTAPE 19)
database.attribuerMainlevee(manifesteId)

// Statistiques
database.obtenirStatistiques()

// Interactions
database.ajouterInteractionWorkflow(type, description)
database.obtenirInteractionsKit(limite)
```

---

## 🔗 Kit MuleSoft Integration

### Configuration

Le client Kit (`lib/kit-client.js`) gère toutes les communications avec le Kit d'Interconnexion.

```javascript
const KitClient = {
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 90000,
  paysCode: 'SEN',
  systemeName: 'SENEGAL_DOUANES_DAKAR',
  
  headers: {
    'X-Source-Country': 'SEN',
    'X-Source-System': 'SENEGAL_DOUANES_DAKAR',
    'X-Source-Port': 'PORT_DAKAR',
    'X-Manifeste-Format': 'UEMOA'
  }
}
```

### Transmission Manifeste (ÉTAPES 4-5)

```javascript
// Méthode principale
kitClient.transmettreManifeste(manifeste)

// Processus:
// 1. Validation manifeste Sénégal
// 2. Préparation extraction UEMOA
// 3. Envoi POST /manifeste/transmission
// 4. Gestion réponse et retry
```

**Extraction envoyée** :
```javascript
{
  // Identifiants origine
  annee_manif: "2025",
  bureau_manif: "18N",
  numero_manif: 5016,
  
  // Info navire
  navire: "MARCO POLO",
  provenance: "ROTTERDAM",
  date_arrivee: "2025-01-15",
  
  // Sénégal spécifique
  paysOrigine: "SENEGAL",
  portDebarquement: "Port de Dakar",
  typeManifeste: "EXTRACTION_LIBRE_PRATIQUE",
  
  // Articles pour Mali uniquement
  nbre_article: 1,
  articles: [/* articles Mali */],
  
  // Workflow
  etapeWorkflow: 5,
  dateTransmission: "2025-01-15T10:01:00Z",
  workflow: "LIBRE_PRATIQUE"
}
```

### Notification Apurement

```javascript
kitClient.notifierApurement(apurementData)

// Données envoyées
{
  numeroManifeste: "5016",
  referencePaiement: "PAY-MLI-2025-001",
  typeApurement: "LEVEE_MARCHANDISE",
  dateApurement: "2025-01-15T16:00:00Z",
  paysApurement: "SEN",
  portApurement: "Port de Dakar",
  agentConfirmation: "AGENT_DOUANES_DAKAR",
  bonEnlever: "BAE_SEN_..."
}

// Header requis
X-Payment-Reference: PAY-MLI-2025-001
```

### Health Check Kit

```javascript
kitClient.verifierSante()

// Test avec retry automatique
// Timeout: 30 secondes
// Retry: 3 tentatives
```

---

## 🎨 Interface utilisateur

### Dashboard Principal

**Fichier** : `public/index.html`  
**URL** : http://localhost:3001

**Sections** :

1. **Header Sénégal**
   - Drapeau Sénégal (vert/jaune/rouge + étoile)
   - Titre et description
   - Informations pays

2. **Bannière Kit Status**
   - État connexion Kit MuleSoft
   - Temps réel
   - 3 états: Connected / Disconnected / Checking

3. **Grille Status (4 cards)**
   - Douanes Sénégal (toujours UP)
   - Kit Interconnexion (dynamique)
   - Statistiques (volume)
   - Performance (KPIs)

4. **Formulaire Création Manifeste**
   - Format UEMOA complet
   - Multi-articles
   - Multi-conteneurs
   - Validation temps réel
   - Bouton création (ÉTAPES 1-5)

5. **Liste Manifestes**
   - Filtres par statut
   - Compteurs dynamiques
   - Actions par manifeste
   - Bouton apurement si éligible

6. **Section Manifestes à Apurer**
   - Priorité haute
   - Badge notification
   - Boutons action rapide
   - Mise en évidence visuelle

7. **Section Apurement**
   - Interface dédiée ÉTAPES 18-19
   - Formulaire confirmation
   - Affichage infos paiement
   - Success screen

8. **Interactions Kit**
   - Timeline temps réel
   - Log workflow
   - Code couleur (succès/erreur)
   - Scroll automatique

### Fonctionnalités Avancées

**Gestion Dynamique Articles** :
```javascript
// Ajouter article
ajouterArticle()

// Supprimer article
supprimerArticle(index)

// Ajouter conteneur
ajouterConteneur(articleIndex)

// Supprimer conteneur
supprimerConteneur(articleIndex, conteneurIndex)
```

**Filtrage Manifestes** :
```javascript
// Filtrer par statut
filtrerManifestes('TOUS')
filtrerManifestes('DECLARATION_RECUE')
filtrerManifestes('TRANSMIS_VERS_DESTINATION')
filtrerManifestes('APURE')

// Mise à jour compteurs
mettreAJourCompteursFiltre(manifestes)
```

**Interface Apurement** :
```javascript
// Ouvrir popup apurement
ouvrirApurement(numeroManifeste, referencePaiement)

// Confirmer apurement
confirmerApurement()

// Fermer
fermerApurement()
```

**URL Directe Apurement** :
```
http://localhost:3001?apurement_manifeste=5016&apurement_paiement=PAY-MLI-001
```

---

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env` (optionnel) :

```env
# Serveur
PORT=3001
NODE_ENV=production

# Kit MuleSoft
KIT_MULESOFT_URL=http://localhost:8080/api/v1
KIT_TIMEOUT=90000

# Sénégal
PAYS_CODE=SEN
PAYS_NOM=Sénégal
PORT_NAME=Port de Dakar
PAYS_ROLE=PAYS_PRIME_ABORD
```

### Configuration Vercel

**Fichier** : `vercel.json`

```json
{
  "version": 2,
  "builds": [{
    "src": "server.js",
    "use": "@vercel/node"
  }],
  "routes": [{
    "src": "/(.*)",
    "dest": "server.js"
  }]
}
```

### Scripts npm

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

## 🧪 Tests et validation

### Tests manuels

```bash
# 1. Health check
curl http://localhost:3001/api/health

# 2. Statistiques
curl http://localhost:3001/api/statistiques

# 3. Création manifeste
curl -X POST http://localhost:3001/api/manifeste/creer \
  -H "Content-Type: application/json" \
  -H "X-Source-Country: SEN" \
  -d @test-manifeste-uemoa.json

# 4. Liste manifestes
curl http://localhost:3001/api/manifeste/lister?limite=10

# 5. Test Kit
curl http://localhost:3001/api/kit/test?type=health
```

### Workflow complet

**Scénario de test** :

1. **Créer manifeste**
   - POST /api/manifeste/creer
   - Vérifier statut TRANSMIS_VERS_DESTINATION
   - Noter le numeroManifeste

2. **Simuler réponse Mali**
   - POST /api/mainlevee/autorisation
   - Envoyer infos paiement
   - Vérifier statut DECLARATION_RECUE

3. **Apurer manifeste**
   - GET /api/apurement/traiter
   - POST /api/apurement/traiter
   - Vérifier statut MAINLEVEE_ATTRIBUEE

4. **Vérifier workflow**
   - GET /api/manifeste/lister
   - Confirmer étapes 1-19 complètes

### Données de test

**Manifeste test complet** :

```json
{
  "annee_manif": "2025",
  "bureau_manif": "18N",
  "numero_manif": 9999,
  "code_cgt": "014",
  "consignataire": "TEST SHIPPING DAKAR",
  "repertoire": "02402",
  
  "navire": "TEST VESSEL",
  "provenance": "HAMBURG",
  "pavillon": "PANAMA",
  "date_arrivee": "2025-01-20",
  "valapprox": 100000,
  
  "nbre_article": 1,
  "articles": [{
    "art": 1,
    "date_emb": "2025-01-15",
    "lieu_emb": "HAMBURG",
    "pays_dest": "MALI",
    "ville_dest": "BAMAKO",
    "connaissement": "TEST123",
    "expediteur": "TEST EXPORT",
    "destinataire": "TEST IMPORT BAMAKO",
    "marchandise": "Matériel informatique test",
    "poids": 500,
    "nbre_colis": 5,
    "nbre_conteneur": 1,
    "conteneurs": [{
      "conteneur": "TEST1234567",
      "type": "DRS",
      "taille": "20",
      "plomb": "TEST001"
    }]
  }]
}
```

---

## 🚀 Déploiement

### Déploiement Vercel

```bash
# Installation Vercel CLI
npm i -g vercel

# Déploiement
vercel

# Production
vercel --prod
```

### Déploiement Heroku

```bash
# Login
heroku login

# Créer app
heroku create simulateur-senegal

# Déployer
git push heroku main

# Configurer
heroku config:set PORT=3001
heroku config:set KIT_MULESOFT_URL=https://...
```

### Docker (optionnel)

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

```bash
# Build
docker build -t simulateur-senegal .

# Run
docker run -p 3001:3001 simulateur-senegal
```

---

## 📚 Documentation complémentaire

### Références UEMOA

- **Rapport PDF** : Étude interconnexion systèmes douaniers
- **Figure 19** : Architecture fonctionnelle libre pratique
- **Figure 20** : Scénario technique transit
- **21 étapes** : Workflow libre pratique complet
- **16 étapes** : Workflow transit inter-états

### Standards supportés

- ✅ **Format UEMOA 2025.1** : Manifestes natifs
- ✅ **Codes pays** : SEN, MLI, BFA, NER, CIV, TGO, BEN, GNB
- ✅ **Workflow OMD** : Conformité standards internationaux
- ✅ **API REST** : Intégration Kit MuleSoft

### Écosystème complet

1. **🇸🇳 Simulateur Sénégal** (ce projet)
   - Pays A - Prime abord
   - Port de Dakar
   - Étapes 1-5, 17-19

2. **🇲🇱 Simulateur Mali**
   - Pays B - Destination
   - Bamako
   - Étapes 6-16

3. **🔗 Kit MuleSoft**
   - Interconnexion UEMOA
   - Routage messages
   - Transformation formats

4. **🏛️ Commission UEMOA**
   - Supervision centrale
   - Statistiques consolidées
   - Étape 21

---

## 👥 Support

### Informations techniques

**Développé par** : Cabinet Jasmine Conseil  
**Conformité** : Rapport PDF UEMOA  
**Version** : 1.0.0-UEMOA  
**Format** : UEMOA 2025.1  
**Runtime** : Node.js 22.x

### Contact

**Port de Dakar** - Système Douanier Sénégal  
Bureau Principal Douanes  
Téléphone : +221-33-889-XX-XX  
Email : douanes.dakar@gouv.sn

### Dépannage

**Problèmes courants** :

1. **Kit inaccessible**
   ```bash
   # Vérifier URL Kit
   curl http://localhost:8080/api/v1/health
   
   # Mode local si Kit down
   KIT_MULESOFT_URL="" npm start
   ```

2. **Port occupé**
   ```bash
   # Changer port
   PORT=3002 npm start
   ```

3. **Erreur validation**
   - Vérifier format UEMOA
   - Champs obligatoires présents
   - Dates au bon format
   - Pays destination valide

### Mode dégradé

Le système fonctionne même sans Kit :
- ✅ Création manifestes (local)
- ✅ Interface web complète
- ⚠️ Transmission Kit désactivée
- ✅ Apurement disponible

---

## 📄 Licence

© 2025 Cabinet Jasmine Conseil - Tous droits réservés

Développé dans le cadre du projet d'interconnexion des systèmes douaniers de l'UEMOA.

---

*Simulateur Sénégal - Port de Dakar - Pays de Prime Abord UEMOA*
*Version 1.0.0 - Format UEMOA 2025.1 - Node.js 22.x*
