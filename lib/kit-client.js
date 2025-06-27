const axios = require('axios');

class KitInterconnexionClient {
  constructor() {
    this.baseURL = process.env.KIT_BASE_URL || 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io';
    this.timeout = 10000;
  }

  async transmettreManifeste(manifeste) {
    try {
      console.log('🚀 Transmission manifeste vers Kit:', manifeste.numeroManifeste);
      
      const response = await axios.post(
        `${this.baseURL}/manifeste/transmission`,
        manifeste,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Source-System': 'PAYS_A_DOUANES',
            'X-Correlation-ID': `PAYS_A_${Date.now()}`
          },
          timeout: this.timeout
        }
      );
      
      console.log('✅ Manifeste transmis avec succès:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur transmission manifeste:', error.message);
      throw error;
    }
  }

  async verifierSante() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      return { status: 'DOWN', error: error.message };
    }
  }
}

module.exports = new KitInterconnexionClient();