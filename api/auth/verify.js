// ============================================================================
// SÉNÉGAL - API Vérification Token
// Fichier: api/auth/verify.js
// ============================================================================

const loginModule = require('./login');

module.exports = async (req, res) => {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET' || req.method === 'POST') {
        try {
            // Récupérer le token depuis les headers ou le body
            let token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token && req.body) {
                token = req.body.token;
            }

            if (!token) {
                return res.status(401).json({
                    valid: false,
                    message: 'Token manquant'
                });
            }

            // Vérifier le token dans les sessions
            const sessions = loginModule.sessions;
            const session = sessions.get(token);

            if (!session) {
                return res.status(401).json({
                    valid: false,
                    message: 'Session invalide ou expirée'
                });
            }

            // Vérifier l'expiration
            if (new Date() > session.expiresAt) {
                sessions.delete(token);
                return res.status(401).json({
                    valid: false,
                    message: 'Session expirée'
                });
            }

            // Token valide
            res.status(200).json({
                valid: true,
                message: 'Session valide',
                user: {
                    username: session.username,
                    role: session.role,
                    workflow: session.workflow
                },
                loginTime: session.loginTime,
                expiresAt: session.expiresAt
            });

        } catch (error) {
            console.error('❌ [SÉNÉGAL] Erreur vérification token:', error);
            res.status(500).json({
                valid: false,
                message: 'Erreur serveur',
                error: error.message
            });
        }
    } else {
        res.status(405).json({
            valid: false,
            message: 'Méthode non autorisée'
        });
    }
};