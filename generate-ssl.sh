#!/bin/bash

# ============================================================================
# Script de génération de certificats SSL pour le simulateur Sénégal
# ============================================================================

echo "🔐 Génération des certificats SSL pour le simulateur Sénégal"
echo ""

# Vérifier que OpenSSL est installé
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL n'est pas installé"
    echo "   Installation :"
    echo "   - Ubuntu/Debian: sudo apt-get install openssl"
    echo "   - CentOS/RHEL: sudo yum install openssl"
    echo "   - macOS: brew install openssl"
    exit 1
fi

# Créer le dossier ssl-certs s'il n'existe pas
if [ ! -d "ssl-certs" ]; then
    echo "📁 Création du dossier ssl-certs..."
    mkdir -p ssl-certs
fi

# Vérifier si openssl.cnf existe
if [ ! -f "ssl-certs/openssl.cnf" ]; then
    echo "❌ Le fichier ssl-certs/openssl.cnf n'existe pas"
    exit 1
fi

cd ssl-certs

# Vérifier si les certificats existent déjà
if [ -f "key.pem" ] || [ -f "cert.pem" ]; then
    echo "⚠️  Des certificats existent déjà dans ssl-certs/"
    read -p "Voulez-vous les remplacer ? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        echo "❌ Génération annulée"
        exit 0
    fi
    echo "🗑️  Suppression des anciens certificats..."
    rm -f key.pem cert.pem
fi

echo "🔑 Génération de la clé privée (4096 bits)..."
openssl genrsa -out key.pem 4096

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération de la clé privée"
    exit 1
fi

echo "📜 Génération du certificat auto-signé (valide 365 jours)..."
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -config openssl.cnf

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération du certificat"
    exit 1
fi

# Vérifier les permissions
chmod 600 key.pem
chmod 644 cert.pem

echo ""
echo "✅ Certificats SSL générés avec succès !"
echo ""
echo "📋 Fichiers créés :"
echo "   - ssl-certs/key.pem (clé privée)"
echo "   - ssl-certs/cert.pem (certificat)"
echo ""
echo "🚀 Pour activer HTTPS :"
echo "   npm start"
echo ""
echo "🌐 Accès HTTPS :"
echo "   - Local: https://localhost:3443"
echo "   - Serveur: https://64.225.5.75:3443"
echo ""
echo "⚠️  Note : Les certificats sont auto-signés"
echo "   Le navigateur affichera un avertissement de sécurité"
echo "   C'est normal - acceptez-le pour continuer"
echo ""

