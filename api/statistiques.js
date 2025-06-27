const db = require('../lib/database');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const stats = db.getStatistiques();
      const manifestes = db.getAllManifestes();
      const autorisations = Array.from(db.autorisations.values());
      
      res.status(200).json({
        statistiques: stats,
        details: {
          manifestesRecents: manifestes.slice(-5),
          autorisationsRecentes: autorisations.slice(-5)
        }
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Erreur récupération statistiques',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};