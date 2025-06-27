const db = require('../../lib/database');
const kitClient = require('../../lib/kit-client');

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
      console.log('📋 Nouveau manifeste reçu:', req.body);
      
      // Enregistrer le manifeste localement
      const manifeste = db.creerManifeste(req.body);
      
      // Simulation délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Transmission automatique vers le Kit d'Interconnexion
      try {
        const reponseKit = await kitClient.transmettreManifeste(manifeste);
        console.log('✅ Manifeste transmis au Kit:', reponseKit);
        
        manifeste.transmissionKit = {
          statut: 'TRANSMIS',
          reponse: reponseKit,
          dateTransmission: new Date()
        };
        
      } catch (error) {
        console.error('❌ Erreur transmission Kit:', error.message);
        manifeste.transmissionKit = {
          statut: 'ERREUR',
          erreur: error.message,
          dateTransmission: new Date()
        };
      }
      
      res.status(200).json({
        status: 'SUCCESS',
        message: 'Manifeste enregistré et transmis',
        manifeste: manifeste,
        numeroManifeste: manifeste.id
      });
      
    } else if (req.method === 'GET') {
      // Récupérer tous les manifestes
      const manifestes = db.getAllManifestes();
      res.status(200).json({
        manifestes: manifestes,
        total: manifestes.length
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Erreur API manifeste:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du traitement du manifeste',
      error: error.message
    });
  }
};