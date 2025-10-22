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

#### **Étapes 1-5 : Entrée et Transmission**
```
Port de Dakar → Kit MuleSoft → Pays de Destination
```

**Détail des étapes :**
- **Étape 1-2** : Téléchargement et réception manifeste par consignataire
- **Étape 3** : Renseignement informations marchandise (articles, conteneurs)
- **Étape 4** : Extraction marchandises pour pays destination
- **Étape 5** : Transmission extraction via Kit MuleSoft

**API correspondante :** `POST /api/manifeste/creer`

#### **Étapes 17-19 : Retour et Apurement**
```
Mali (Pays B) → Kit MuleSoft → Port de Dakar
```

**Détail des étapes :**
- **Étape 17** : Réception informations déclaration/recouvrement depuis Mali
- **Étape 18** : Apurement du manifeste au Port de Dakar
- **Étape 19** : Attribution main levée (Bon à Enlever - BAE)

**APIs correspondantes :**
- `POST /api/mainlevee/autorisation` (Étape 17)
- `POST /api/apurement/traiter` (Étapes 18-19)

#### **Étapes 6-16 : Traitement au Mali** 
*(Non gérées par le Sénégal - Pays de destination)*

---

### 2️⃣ Workflow Transit (16 étapes au total)

Le Sénégal gère **9 étapes sur 16** :

#### **Étapes 1-6 : Création Transit**
- Création déclaration transit au départ
- Transmission copie vers destination

**API :** `POST /api/transit/creer`

#### **Étape 14 : Message Arrivée**
- Réception confirmation arrivée depuis Mali

**API :** `POST /api/transit/arrivee`

#### **Étapes 15-16 : Apurement Transit**
- Apurement et libération garanties

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
- **Dashboard** : http://64.225.5.75:3001
- **Health Check** : http://64.225.5.75:3001/api/health
- **Statistiques** : http://64.225.5.75:3001/api/statistiques

---

## 🔌 APIs Principales

### Workflow Libre Pratique

| Étape | Endpoint | Méthode | Description |
|-------|----------|---------|-------------|
| 1-5 | `/api/manifeste/creer` | POST | Création manifeste + transmission Kit |
| 17 | `/api/mainlevee/autorisation` | POST | Réception info paiement Mali |
| 18-19 | `/api/apurement/traiter` | POST | Apurement + main levée |
| - | `/api/manifeste/lister` | GET | Liste manifestes |

### Workflow Transit

| Étape | Endpoint | Méthode | Description |
|-------|----------|---------|-------------|
| 1-6 | `/api/transit/creer` | POST | Création transit |
| 14 | `/api/transit/arrivee` | POST | Message arrivée Mali |
| - | `/api/transit/lister` | GET | Liste transits |

### Système

| Endpoint | Description |
|----------|-------------|
| `/api/health` | État système + Kit MuleSoft |
| `/api/statistiques` | Métriques temps réel |

---

## 📊 Exemple Complet : Workflow Libre Pratique

### 1. Création Manifeste (Étapes 1-5)

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

### 2. Réception Autorisation Mali (Étape 17)

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

### 3. Apurement et Levée (Étapes 18-19)

```bash
curl -X POST http://64.225.5.75:3001/api/apurement/traiter \
  -H "Content-Type: application/json" \
  -d '{
    "numeroManifeste": "5016",
    "referencePaiement": "PAY-MLI-2025-001",
    "agentConfirmation": "AGENT_DOUANES_DAKAR"
  }'
```

**Résultat :**
```json
{
  "status": "SUCCESS",
  "message": "Workflow Sénégal terminé",
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

## 🎨 Interface Web

Accessible sur http://64.225.5.75:3001 avec :

- ✅ Création manifestes format UEMOA
- ✅ Gestion multi-articles et conteneurs
- ✅ Section manifestes à apurer (Étape 17 reçue)
- ✅ Interface apurement (Étapes 18-19)
- ✅ Workflow transit
- ✅ Monitoring temps réel

---

## 📈 Statuts du Workflow

| Statut | Étapes | Description |
|--------|--------|-------------|
| `MANIFESTE_CREE` | 1-3 | Créé au Port de Dakar |
| `TRANSMIS_VERS_DESTINATION` | 1-5 | Envoyé au Mali via Kit |
| `DECLARATION_RECUE` | 1-5, 17 | Info paiement reçue |
| `APURE` | 1-5, 17-18 | Apurement confirmé |
| `MAINLEVEE_ATTRIBUEE` | 1-5, 17-19 | Bon à enlever émis ✅ |

---

## 🔗 Architecture Interconnexion

```
Port de Dakar (Sénégal)
    ↓ ÉTAPES 1-5
Kit MuleSoft (http://64.225.5.75:8086)
    ↓ Routage
Mali/Burkina/Niger (Destination)
    ↓ ÉTAPES 6-16
Kit MuleSoft
    ↓ ÉTAPE 17
Port de Dakar
    ↓ ÉTAPES 18-19
✅ Workflow Terminé
```

---

## 🔧 Configuration

```env
PORT=3001
KIT_MULESOFT_URL=http://64.225.5.75:8086/api/v1
PAYS_CODE=SEN
PORT_NAME=Port de Dakar
```

---

## 📝 Authentification

Comptes disponibles :
- `admin / admin123` (Tous workflows)
- `douane / douane2025` (Tous workflows)
- `lp_user / lp123` (Libre Pratique)
- `transit_user / transit123` (Transit)

---

## 🆘 Support

**Développé par** : Cabinet Jasmine Conseil  
**Conformité** : Rapport PDF UEMOA - Interconnexion SI Douaniers  
**Version** : 1.0.0-UEMOA  
**Runtime** : Node.js 22.x

**Contact** : douanes.dakar@gouv.sn

---

## 📄 Licence

© 2025 Cabinet Jasmine Conseil - Tous droits réservés

*Simulateur Sénégal - Port de Dakar - Pays de Prime Abord UEMOA*
