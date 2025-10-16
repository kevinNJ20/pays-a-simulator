// ============================================================================
// SÉNÉGAL - API Authentification
// Fichier: api/auth/login.js
// ============================================================================

// Base de données des utilisateurs (à adapter selon vos besoins)
const USERS = {
    // Utilisateurs Libre Pratique
    'admin': { password: 'admin123', workflows: ['libre-pratique', 'transit'], role: 'ADMIN' },
    'douane': { password: 'douane2025', workflows: ['libre-pratique', 'transit'], role: 'AGENT_DOUANE' },
    'lp_user': { password: 'lp123', workflows: ['libre-pratique'], role: 'OPERATEUR_LP' },
    
    // Utilisateurs Transit
    'transit_user': { password: 'transit123', workflows: ['transit'], role: 'OPERATEUR_TRANSIT' },
    'consignataire': { password: 'consig2025', workflows: ['libre-pratique', 'transit'], role: 'CONSIGNATAIRE' }
};

// Génération de token simple (à remplacer par JWT en production)
function generateToken(username, workflow) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return Buffer.from(`${username}:${workflow}:${timestamp}:${random}`).toString('base64');
}

// Stockage des sessions (en mémoire pour la démo)
const sessions = new Map();

module.exports = async (req, res) => {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            const { username, password, workflow } = req.body;

            console.log(`🔐 [SÉNÉGAL] Tentative de connexion: ${username} - Workflow: ${workflow}`);

            // Validation des champs
            if (!username || !password || !workflow) {
                return res.status(400).json({
                    success: false,
                    message: 'Identifiant, mot de passe et workflow requis'
                });
            }

            // Vérification des credentials
            const user = USERS[username];
            
            if (!user) {
                console.log(`❌ [SÉNÉGAL] Utilisateur ${username} non trouvé`);
                return res.status(401).json({
                    success: false,
                    message: 'Identifiant ou mot de passe incorrect'
                });
            }

            if (user.password !== password) {
                console.log(`❌ [SÉNÉGAL] Mot de passe incorrect pour ${username}`);
                return res.status(401).json({
                    success: false,
                    message: 'Identifiant ou mot de passe incorrect'
                });
            }

            // Vérification des permissions workflow
            if (!user.workflows.includes(workflow)) {
                console.log(`❌ [SÉNÉGAL] ${username} non autorisé pour ${workflow}`);
                return res.status(403).json({
                    success: false,
                    message: `Vous n'êtes pas autorisé à accéder au workflow ${workflow}`
                });
            }

            // Génération du token
            const token = generateToken(username, workflow);
            
            // Stockage de la session
            sessions.set(token, {
                username,
                workflow,
                role: user.role,
                loginTime: new Date(),
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 heures
            });

            console.log(`✅ [SÉNÉGAL] Connexion réussie: ${username} - ${workflow} - Rôle: ${user.role}`);

            res.status(200).json({
                success: true,
                message: 'Connexion réussie',
                token,
                user: {
                    username,
                    role: user.role,
                    workflows: user.workflows
                },
                workflow,
                paysTraitement: {
                    code: 'SEN',
                    nom: 'Sénégal',
                    port: 'Port de Dakar',
                    role: 'PAYS_PRIME_ABORD'
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ [SÉNÉGAL] Erreur authentification:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur lors de l\'authentification',
                error: error.message
            });
        }
    } else {
        res.status(405).json({
            success: false,
            message: 'Méthode non autorisée',
            methodesAutorisees: ['POST', 'OPTIONS']
        });
    }
};

// Export des sessions pour vérification
module.exports.sessions = sessions;
module.exports.USERS = USERS;