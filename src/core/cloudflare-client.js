const httpAdapter = require('../adapters/http-adapter');
const { CloudflareApiError } = require('../utils/errors');

class CloudflareClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.apiKey = config.apiKey;
    this.email = config.email;
    this.accountId = config.accountId;
  }
  
  getRequestOptions() {
    return {
      apiKey: this.apiKey,
      email: this.email,
      accountId: this.accountId,
      logger: this.logger
    };
  }
  
  async listTunnels() {
    this.logger.logApiCall('GET', `/accounts/${this.accountId}/cfd_tunnel`);
    const response = await httpAdapter.get(
      `/accounts/${this.accountId}/cfd_tunnel`,
      this.getRequestOptions()
    );
    return response.result || [];
  }
  
  async getTunnelByName(name) {
    const tunnels = await this.listTunnels();
    return tunnels.find(t => t.name === name) || null;
  }
  
  async createTunnel(name) {
    const tunnelSecret = this.generateTunnelSecret();
    this.logger.logApiCall('POST', `/accounts/${this.accountId}/cfd_tunnel`, { name });
    this.logger.info(`Creating tunnel: ${name}`);
    
    const response = await httpAdapter.post(
      `/accounts/${this.accountId}/cfd_tunnel`,
      {
        name,
        tunnel_secret: tunnelSecret
      },
      this.getRequestOptions()
    );
    
    this.logger.success(`Tunnel created: ${name} (ID: ${response.result.id})`);
    return { ...response.result, tunnelSecret };
  }
  
  async getTunnelToken(tunnelId) {
    this.logger.logApiCall('GET', `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}/token`);
    const response = await httpAdapter.get(
      `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}/token`,
      this.getRequestOptions()
    );
    return response.result;
  }

  async getTunnelConnections(tunnelId) {
    this.logger.logApiCall('GET', `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}/connections`);
    const response = await httpAdapter.get(
      `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}/connections`,
      this.getRequestOptions()
    );
    return response.result || [];
  }
  
  async getOrCreateTunnel(name) {
    let tunnel = await this.getTunnelByName(name);
    if (tunnel) {
      this.logger.info(`Tunnel already exists: ${name} (ID: ${tunnel.id})`);
      return { ...tunnel, tunnelSecret: null };
    }
    return await this.createTunnel(name);
  }
  
  async listDnsRecords(zoneId) {
    this.logger.logApiCall('GET', `/zones/${zoneId}/dns_records`);
    const response = await httpAdapter.get(
      `/zones/${zoneId}/dns_records`,
      this.getRequestOptions()
    );
    return response.result || [];
  }
  
  async getDnsRecordByName(zoneId, name) {
    const records = await this.listDnsRecords(zoneId);
    return records.find(r => r.name === name) || null;
  }
  
  async createDnsRecord(zoneId, recordData) {
    this.logger.logApiCall('POST', `/zones/${zoneId}/dns_records`, recordData);
    this.logger.info(`Creating DNS record: ${recordData.name}`);
    
    const response = await httpAdapter.post(
      `/zones/${zoneId}/dns_records`,
      recordData,
      this.getRequestOptions()
    );
    
    this.logger.success(`DNS record created: ${recordData.name}`);
    return response.result;
  }
  
  async getZoneIdByDomain(domain) {
    if (this.config.zoneId) {
      this.logger.info(`Using configured Zone ID: ${this.config.zoneId}`);
      return this.config.zoneId;
    }

    this.logger.logApiCall('GET', '/zones');
    const response = await httpAdapter.get('/zones', this.getRequestOptions());
    const zones = response.result || [];

    if (this.config.zoneName) {
      const zoneByName = zones.find(z => z.name === this.config.zoneName);
      return zoneByName ? zoneByName.id : null;
    }

    const parts = domain.split('.');
    const rootDomain = parts.slice(-2).join('.');
    const zone = zones.find(z => z.name === rootDomain);

    if (!zone) {
      this.logger.warn(`Unable to resolve zone using root domain guess: ${rootDomain}`);
    }

    return zone ? zone.id : null;
  }
  
  async getOrCreateDnsRecord(hostname, tunnelId) {
    const parts = hostname.split('.');
    const domain = parts.slice(-2).join('.');
    
    const zoneId = await this.getZoneIdByDomain(domain);
    if (!zoneId) {
      throw new CloudflareApiError(`Zone not found for domain: ${domain}`, 404);
    }
    
    const existingRecord = await this.getDnsRecordByName(zoneId, hostname);
    if (existingRecord) {
      this.logger.info(`DNS record already exists: ${hostname}`);
      return existingRecord;
    }
    
    return await this.createDnsRecord(zoneId, {
      type: 'CNAME',
      name: hostname,
      content: `${tunnelId}.cfargotunnel.com`,
      proxied: true,
      ttl: 1
    });
  }
  
  generateTunnelSecret() {
    const crypto = require('crypto');
    const secret = crypto.randomBytes(32);
    return secret.toString('base64');
  }
}

module.exports = CloudflareClient;
