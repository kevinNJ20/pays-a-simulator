// ============================================================================
// SÉNÉGAL - API Déconnexion
// Fichier: api/auth/logout.js
// ============================================================================

const loginModule = require('./login');

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
            // Récupérer le token
            let token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token && req.body) {
                token = req.body.token;
            }

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token manquant'
                });
            }

            // Supprimer la session
            const sessions = loginModule.sessions;
            const session = sessions.get(token);
            
            if (session) {
                console.log(`🚪 [SÉNÉGAL] Déconnexion: ${session.username} - ${session.workflow}`);
                sessions.delete(token);
            }

            res.status(200).json({
                success: true,
                message: 'Déconnexion réussie',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ [SÉNÉGAL] Erreur déconnexion:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur',
                error: error.message
            });
        }
    } else {
        res.status(405).json({
            success: false,
            message: 'Méthode non autorisée'
        });
    }
};