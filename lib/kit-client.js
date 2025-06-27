const axios = require('axios');

class KitInterconnexionClient {
  constructor() {
    // URL CloudHub mise à jour
    this.baseURL = process.env.KIT_BASE_URL || 'https://kit-interconnexion-uemoa-v4320.m3jzw3-1.deu-c1.cloudhub.io/api';
    this.timeout = 15000;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pays-A-Cotier-Client/1.0'
      }
    });
    
    this.setupRetry();
  }

  setupRetry() {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        if (!config._retry && config.retry !== false) {
          config._retry = true;
          console.log('🔄 Retry transmission vers Kit...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.client.request(config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  async transmettreManifeste(manifeste) {
    try {
      console.log('🚀 Transmission manifeste vers Kit CloudHub:', manifeste.numeroManifeste || manifeste.id);
      
      const response = await this.client.post('/manifeste/transmission', manifeste, {
        headers: {
          'X-Source-System': 'PAYS_A_DOUANES',
          'X-Source-Country': 'CIV',
          'X-Correlation-ID': `PAYS_A_${Date.now()}`
        }
      });
      
      console.log('✅ Manifeste transmis avec succès:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur transmission manifeste:', error.message);
      if (error.response) {
        console.error('Statut:', error.response.status);
        console.error('Données:', error.response.data);
      }
      throw error;
    }
  }

  async verifierSante() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { 
        status: 'DOWN', 
        error: error.message,
        url: this.baseURL 
      };
    }
  }

  async testerConnectivite() {
    try {
      const startTime = Date.now();
      const response = await this.verifierSante();
      const duration = Date.now() - startTime;
      
      return {
        accessible: response.status === 'UP',
        duree: duration,
        reponse: response,
        url: this.baseURL
      };
    } catch (error) {
      return {
        accessible: false,
        erreur: error.message,
        url: this.baseURL
      };
    }
  }
}

module.exports = new KitInterconnexionClient();