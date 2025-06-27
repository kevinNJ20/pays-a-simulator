const cors = require('cors');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const healthStatus = {
      service: 'Système Douanier Pays A (Côtier)',
      status: 'UP',
      version: '1.0.0-POC',
      timestamp: new Date().toISOString(),
      pays: {
        code: 'CIV',
        nom: 'Côte d\'Ivoire',
        type: 'COTIER'
      },
      endpoints: {
        manifesteCreation: '/api/manifeste/enregistrer',
        autorisationMainlevee: '/api/mainlevee/autorisation',
        statistiques: '/api/statistiques'
      }
    };

    res.status(200).json(healthStatus);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};