# 🇸🇳 Simulateur Système Douanier Sénégal - Port de Dakar

Simulateur **Pays A** selon le rapport PDF UEMOA - Workflow libre pratique et transit.

## 🚀 **Démarrage rapide**

### **1. En local (développement)**

```bash
# Option 1: Script npm
npm start

# Option 2: Script de démarrage local
node start-local.js

# Option 3: Serveur direct
node server.js
```

### **2. Avec Vercel (déploiement)**

```bash
# Si vercel CLI installée
npm install -g vercel
vercel dev

# Sinon, utiliser le mode local
npm start
```

## 📋 **URLs disponibles**

- **Interface web**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health
- **API Statistiques**: http://localhost:3001/api/statistiques

## 🔥 **Workflow simulé**

### **Libre Pratique (21 étapes)**
- ✅ **ÉTAPES 1-5**: Création et transmission manifeste vers Kit MuleSoft
- ✅ **ÉTAPE 17**: Réception informations déclaration/recouvrement
- ✅ **ÉTAPES 18-19**: Apurement et attribution main levée

### **Transit (16 étapes)**
- ✅ **ÉTAPES 1-6**: Création déclaration transit au départ
- ✅ **ÉTAPE 14**: Réception message arrivée destination

## 🔧 **Configuration**

- **Port**: 3001 (configurable via PORT env var)
- **Kit MuleSoft**: http://localhost:8080/api/v1
- **Format**: UEMOA natif
- **Base de données**: Embarquée (lib/database.js)

## 🎯 **Endpoints principaux**

| **Endpoint** | **Méthode** | **Description** |
|--------------|-------------|-----------------|
| `/api/health` | GET | Santé du système |
| `/api/manifeste/creer` | POST | ÉTAPES 1-5 |
| `/api/mainlevee/autorisation` | POST | ÉTAPE 17 |
| `/api/apurement/traiter` | POST | ÉTAPES 18-19 |

## 🔍 **Dépannage**

### **Erreur "vercel command not found"**
```bash
# Utiliser le mode local à la place
npm start
```

### **Port déjà utilisé**
```bash
# Changer le port
PORT=3002 npm start
```

### **Kit MuleSoft inaccessible**
Le système fonctionne en mode dégradé sans Kit MuleSoft.

---

**Simulateur Sénégal** | Version 1.0.0 | Port de Dakar | Pays de prime abord