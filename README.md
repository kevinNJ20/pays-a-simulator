# 🇸🇳 Simulateur Système Douanier Sénégal - Port de Dakar

**Version 1.0.0** | Format UEMOA 2025.1 | Node.js 22.x

Simulateur complet du système douanier sénégalais conforme au rapport d'interconnexion UEMOA. Implémente le rôle de **Pays de Prime Abord** pour les workflows Libre Pratique (21 étapes) et Transit (16 étapes).

---

## 🎯 Vue d'ensemble

### Rôle dans l'écosystème UEMOA

| Propriété | Valeur |
|-----------|--------|
| **Pays** | Sénégal (SEN) |
| **Ville** | Dakar |
| **Type** | Pays côtier |
| **Rôle** | PAYS_PRIME_ABORD |
| **Port** | Port de Dakar (Bureau 18N) |
| **Code CGT** | 014 |
| **Format** | UEMOA 2025.1 natif |

### Architecture du système

```
Port de Dakar (Sénégal)
    ↓ ÉTAPES 1-5: Création + Transmission manifeste
Kit MuleSoft (Interconnexion)
    ↓ Routage automatique
Mali/Burkina Faso/Niger (Destination)
    ↓ ÉTAPES 6-16: Traitement déclaration
Kit MuleSoft
    ↓ ÉTAPE 17: Retour infos paiement
Port de Dakar
    ↓ ÉTAPES 18-19: Apurement + Levée
✅ Marchandises libérées
```

---

## 🚀 Démarrage rapide

### Installation

```bash
# Cloner et installer
git clone <repository-url>
cd simulateur-senegal
npm install

# Vérifier Node.js
node --version  # Doit être v22.x ou supérieur
```

### Lancement

```bash
npm start
# Serveur démarré sur http://64.225.5.75:3001
```

### URLs principales

| Service | URL | Description |
|---------|-----|-------------|
| 🖥️ Dashboard | http://64.225.5.75:3001 | Interface web complète |
| 🏥 Health | http://64.225.5.75:3001/api/health | État du système |
| 📊 Stats | http://64.225.5.75:3001/api/statistiques | Métriques temps réel |
| 📦 Manifestes | http://64.225.5.75:3001/api/manifeste/lister | Liste des manifestes |

---

## 📋 Workflows implémentés

### 1️⃣ Workflow Libre Pratique (21 étapes)

Le Sénégal gère les **étapes 1-5, 17-19** du workflow complet.

#### ÉTAPES 1-3 : Création manifeste
- Consignataire saisit les informations navire et marchandises
- Validation format UEMOA
- Enregistrement dans base locale Port de Dakar

```javascript
// Exemple de manifeste UEMOA
POST /api/manifeste/creer
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
    "poids": 1500,
    "destinataire": "IMPORT SARL BAMAKO"
  }]
}
```

#### ÉTAPES 4-5 : Transmission Kit
- Extraction automatique des marchandises pour destination
- Envoi vers Kit MuleSoft
- Routage vers pays de destination (Mali, Burkina Faso, etc.)

#### ÉTAPES 6-16 : Traitement destination
**Non géré par le Sénégal** - Traité par le pays de destination

#### ÉTAPE 17 : Réception déclaration
- Le pays de destination envoie les infos de paiement
- Réception via Kit MuleSoft
- Enregistrement au Port de Dakar

```javascript
POST /api/mainlevee/autorisation
{
  "autorisationMainlevee": {
    "numeroManifeste": "5016",
    "montantAcquitte": 250000,
    "paysDeclarant": "MLI",
    "referencePaiement": "PAY-MLI-2025-001"
  }
}
```

#### ÉTAPES 18-19 : Apurement et levée
- Agent douanes confirme le paiement
- Apurement du manifeste
- Génération Bon à Enlever (BAE)
- **Workflow Sénégal terminé** ✅

```javascript
POST /api/apurement/traiter
{
  "numeroManifeste": "5016",
  "referencePaiement": "PAY-MLI-2025-001",
  "agentConfirmation": "AGENT_DOUANES_DAKAR"
}

// Réponse: Bon à enlever généré
```

### 2️⃣ Workflow Transit (16 étapes)

Le Sénégal gère les **étapes 1-6, 14-16**.

#### Processus
1. **ÉTAPES 1-6** : Création déclaration transit au départ
2. **ÉTAPES 10-11** : Transmission copie vers destination
3. **ÉTAPE 14** : Réception message arrivée
4. **ÉTAPES 15-16** : Apurement transit et libération garanties

---

## 🔌 APIs disponibles

### Services principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/health` | GET | État système et Kit |
| `/api/statistiques` | GET | Métriques et KPIs |
| `/api/manifeste/creer` | POST | ÉTAPES 1-5 |
| `/api/manifeste/lister` | GET | Liste manifestes |
| `/api/mainlevee/autorisation` | POST | ÉTAPE 17 |
| `/api/apurement/traiter` | GET/POST | ÉTAPES 18-19 |
| `/api/kit/test` | GET | Test Kit MuleSoft |

### Exemple : Créer un manifeste

```bash
curl -X POST http://64.225.5.75:3001/api/manifeste/creer \
  -H "Content-Type: application/json" \
  -H "X-Source-Country: SEN" \
  -d @manifeste.json
```

### Exemple : Lister les manifestes

```bash
curl http://64.225.5.75:3001/api/manifeste/lister?limite=10&statut=DECLARATION_RECUE
```

---

## 💾 Base de données

### Structure manifeste

```javascript
{
  id: "SEN_5016_2025",
  numero_manif: 5016,
  format: "UEMOA",
  consignataire: "MAERSK LINE SENEGAL",
  navire: "MARCO POLO",
  statut: "MANIFESTE_CREE",
  
  // Workflow tracking
  workflow: {
    etape1_manifesteRecu: "2025-01-15T10:00:00Z",
    etape4_transmissionKit: "2025-01-15T10:01:00Z",
    etape17_declarationRecue: "2025-01-15T14:30:00Z",
    etape18_apurement: "2025-01-15T16:00:00Z",
    etape19_mainlevee: "2025-01-15T16:01:00Z"
  },
  
  // Données métier
  articles: [...],
  transmissionKit: {...},
  informationsDeclaration: {...},
  apurement: {...},
  bonEnlever: {...}
}
```

### Statuts du workflow

| Statut | Description | Étapes complétées |
|--------|-------------|-------------------|
| `MANIFESTE_CREE` | Créé localement | 1-3 |
| `TRANSMIS_VERS_DESTINATION` | Envoyé au Kit | 1-5 |
| `DECLARATION_RECUE` | Info paiement reçue | 1-5, 17 |
| `APURE` | Apurement confirmé | 1-5, 17-18 |
| `MAINLEVEE_ATTRIBUEE` | Bon à enlever émis | 1-5, 17-19 ✅ |

---

## 🔗 Kit MuleSoft

### Configuration

```javascript
{
  baseURL: 'http://64.225.5.75:8086/api/v1',
  timeout: 90000,
  headers: {
    'X-Source-Country': 'SEN',
    'X-Source-System': 'SENEGAL_DOUANES_DAKAR',
    'X-Manifeste-Format': 'UEMOA'
  }
}
```

### Endpoints Kit utilisés

| Endpoint Kit | Utilisé pour |
|--------------|--------------|
| `/health` | Vérification connectivité |
| `/manifeste/transmission` | ÉTAPES 4-5 |
| `/transit/creation` | Transit ÉTAPES 10-11 |
| `/apurement/notification` | Notification apurement |

---

## 🎨 Interface web

### Fonctionnalités du dashboard

- ✅ **Création de manifestes** : Formulaire complet format UEMOA
- ✅ **Gestion multi-articles** : Ajout/suppression articles et conteneurs
- ✅ **Filtrage avancé** : Par statut, pays destination, étape workflow
- ✅ **Manifestes à apurer** : Section dédiée avec notification
- ✅ **Interface apurement** : ÉTAPES 18-19 en un clic
- ✅ **Workflow transit** : Création et suivi déclarations transit
- ✅ **Monitoring temps réel** : État Kit, statistiques, interactions
- ✅ **Tests connectivité** : Kit MuleSoft et diagnostic système

---

## ⚙️ Configuration

### Variables d'environnement

```env
# Serveur
PORT=3001

# Kit MuleSoft
KIT_MULESOFT_URL=http://64.225.5.75:8086/api/v1
KIT_TIMEOUT=90000

# Sénégal
PAYS_CODE=SEN
PORT_NAME=Port de Dakar
```

### Scripts disponibles

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "curl http://64.225.5.75:3001/api/health"
  }
}
```

---

## 🧪 Tests

### Scénario complet

```bash
# 1. Créer un manifeste
curl -X POST http://64.225.5.75:3001/api/manifeste/creer \
  -H "Content-Type: application/json" \
  -d '{"numero_manif": 9999, ...}'

# 2. Vérifier la transmission
curl http://64.225.5.75:3001/api/manifeste/lister

# 3. Simuler réception Mali (ÉTAPE 17)
curl -X POST http://64.225.5.75:3001/api/mainlevee/autorisation \
  -d '{"autorisationMainlevee": {"numeroManifeste": "9999", ...}}'

# 4. Apurer le manifeste (ÉTAPES 18-19)
curl -X POST http://64.225.5.75:3001/api/apurement/traiter \
  -d '{"numeroManifeste": "9999", "agentConfirmation": "TEST_AGENT"}'
```

### Résultat attendu

```json
{
  "status": "SUCCESS",
  "message": "🎉 WORKFLOW SÉNÉGAL TERMINÉ",
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

## 🚀 Déploiement

### Vercel

```bash
npm i -g vercel
vercel --prod
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## 📚 Documentation complémentaire

### Standards supportés

- ✅ **Format UEMOA 2025.1** : Manifestes natifs
- ✅ **Workflow OMD** : Conformité standards internationaux
- ✅ **API REST** : Intégration Kit MuleSoft
- ✅ **Codes pays UEMOA** : SEN, MLI, BFA, NER, CIV, TGO, BEN, GNB

### Écosystème complet

1. **🇸🇳 Simulateur Sénégal** (ce projet) - Étapes 1-5, 17-19
2. **🇲🇱 Simulateur Mali** - Étapes 6-16
3. **🔗 Kit MuleSoft** - Interconnexion et routage
4. **🏛️ Commission UEMOA** - Supervision (Étape 21)

---

## 👥 Support

**Développé par** : Cabinet Jasmine Conseil  
**Conformité** : Rapport PDF UEMOA  
**Version** : 1.0.0-UEMOA  
**Runtime** : Node.js 22.x

### Contact

**Port de Dakar** - Système Douanier Sénégal  
Bureau Principal Douanes  
Email : douanes.dakar@gouv.sn

### Dépannage

**Kit inaccessible ?**
```bash
curl http://64.225.5.75:8086/api/v1/health
KIT_MULESOFT_URL="" npm start  # Mode local
```

**Port occupé ?**
```bash
PORT=3002 npm start
```

---

## 📄 Licence

© 2025 Cabinet Jasmine Conseil - Tous droits réservés

*Simulateur Sénégal - Port de Dakar - Pays de Prime Abord UEMOA*  
*Version 1.0.0 | Format UEMOA 2025.1 | Node.js 22.x*
