// ============================================================================
// SÉNÉGAL - Script Authentification Client
// Fichier: public/auth.js
// ============================================================================

const AUTH_CONFIG = {
    TOKEN_KEY: 'auth_token',
    WORKFLOW_KEY: 'workflow',
    USERNAME_KEY: 'username',
    ROLE_KEY: 'user_role'
};

// Vérifier l'authentification
async function checkAuth(requiredWorkflow) {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    const workflow = localStorage.getItem(AUTH_CONFIG.WORKFLOW_KEY);
    
    if (!token) {
        console.log('❌ [AUTH] Aucun token trouvé');
        redirectToLogin();
        return false;
    }
    
    if (requiredWorkflow && workflow !== requiredWorkflow) {
        console.log(`❌ [AUTH] Workflow incorrect: ${workflow} !== ${requiredWorkflow}`);
        redirectToLogin();
        return false;
    }
    
    try {
        // Vérifier le token auprès du serveur
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (response.ok && data.valid) {
            console.log('✅ [AUTH] Session valide:', data.user);
            return true;
        } else {
            console.log('❌ [AUTH] Session invalide:', data.message);
            clearAuth();
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('❌ [AUTH] Erreur vérification:', error);
        redirectToLogin();
        return false;
    }
}

// Déconnexion
async function logout() {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    
    if (token) {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token })
            });
        } catch (error) {
            console.error('❌ [AUTH] Erreur déconnexion:', error);
        }
    }
    
    clearAuth();
    redirectToLogin();
}

// Nettoyer les données d'authentification
function clearAuth() {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.WORKFLOW_KEY);
    localStorage.removeItem(AUTH_CONFIG.USERNAME_KEY);
    localStorage.removeItem(AUTH_CONFIG.ROLE_KEY);
}

// Rediriger vers la page de login
function redirectToLogin() {
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        window.location.href = '/';
    }
}

// Obtenir les informations utilisateur
function getUserInfo() {
    return {
        username: localStorage.getItem(AUTH_CONFIG.USERNAME_KEY),
        workflow: localStorage.getItem(AUTH_CONFIG.WORKFLOW_KEY),
        role: localStorage.getItem(AUTH_CONFIG.ROLE_KEY),
        token: localStorage.getItem(AUTH_CONFIG.TOKEN_KEY)
    };
}

// Afficher les informations utilisateur dans l'interface
function displayUserInfo(containerId = 'user-info') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const userInfo = getUserInfo();
    const workflowLabel = userInfo.workflow === 'libre-pratique' ? '📋 Libre Pratique' : '🚛 Transit';
    
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; padding: 10px 20px; background: rgba(255,255,255,0.95); border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="flex: 1;">
                <div style="font-weight: bold; color: #2c3e50;">👤 ${userInfo.username}</div>
                <div style="font-size: 0.85em; color: #7f8c8d;">${workflowLabel}</div>
            </div>
            <button onclick="logout()" style="padding: 8px 16px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🚪 Déconnexion
            </button>
        </div>
    `;
}

// Export des fonctions
window.checkAuth = checkAuth;
window.logout = logout;
window.getUserInfo = getUserInfo;
window.displayUserInfo = displayUserInfo;