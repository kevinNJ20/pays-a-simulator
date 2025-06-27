const db = require('../../lib/database');

module.exports = async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      console.log('🔓 Autorisation mainlevée reçue:', req.body);
      
      const autorisation = req.body.autorisationMainlevee || req.body;
      
      // Enregistrer l'autorisation
      const autorisationEnregistree = db.recevoirAutorisation(autorisation);
      
      console.log('✅ Mainlevée autorisée pour manifeste:', autorisation.numeroManifeste);
      
      res.status(200).json({
        status: 'ACCEPTED',
        message: 'Mainlevée autorisée avec succès',
        autorisation: autorisationEnregistree,
        numeroManifeste: autorisation.numeroManifeste,
        dateTraitement: new Date()
      });
      
    } else if (req.method === 'GET') {
      // Récupérer toutes les autorisations
      const autorisations = Array.from(db.autorisations.values());
      res.status(200).json({
        autorisations: autorisations,
        total: autorisations.length
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Erreur API autorisation:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du traitement de l\'autorisation',
      error: error.message
    });
  }
};