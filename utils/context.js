const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let globalDomainSet = null;

class ValidationContext {
    constructor(email) {
        this.email = email;
        const [local, domain] = email.split('@');
        this.localPart = local;
        this.domain = domain;
        
        // Cached results
        this.mxRecords = null;
        this.txtRecords = null;
        this.aRecords = null;
        this.nsRecords = null;
        this.whoisData = null;
        
        // Signals and scores
        this.signals = {};
        this.reasons = [];
        this.score = 0;
        this.isValid = true;
    }

    /**
     * Loads the global blacklist/disposable domains set.
     */
    static getGlobalDomains() {
        if (globalDomainSet === null) {
            const dataPath = path.join(__dirname, '../data', 'domains.json');
            try {
                if (fs.existsSync(dataPath)) {
                    logger.debug('Loading domains.json into memory...');
                    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                    globalDomainSet = new Set(data);
                    logger.debug(`Loaded ${globalDomainSet.size} domains.`);
                } else {
                    logger.warn('domains.json not found, using empty set.');
                    globalDomainSet = new Set();
                }
            } catch (e) {
                logger.error(`Failed to load domains.json: ${e.message}`);
                globalDomainSet = new Set();
            }
        }
        return globalDomainSet;
    }

    isDomainInBlacklist(domain) {
        const set = ValidationContext.getGlobalDomains();
        const target = domain.toLowerCase();
        
        if (set.has(target)) return true;
        
        // Subdomain check
        const parts = target.split('.');
        if (parts.length > 2) {
            for (let i = 0; i < parts.length - 1; i++) {
                const sub = parts.slice(i).join('.');
                if (set.has(sub)) return true;
            }
        }
        return false;
    }

    async getMX() {
        if (this.mxRecords === null) {
            logger.debug(`Fetching MX records for ${this.domain}`);
            try {
                this.mxRecords = await dns.resolveMx(this.domain);
            } catch (e) {
                this.mxRecords = [];
            }
        }
        return this.mxRecords;
    }

    async getTXT() {
        if (this.txtRecords === null) {
            logger.debug(`Fetching TXT records for ${this.domain}`);
            try {
                this.txtRecords = (await dns.resolveTxt(this.domain)).flat();
            } catch (e) {
                this.txtRecords = [];
            }
        }
        return this.txtRecords;
    }

    async getDNS() {
        if (this.aRecords === null) {
            logger.debug(`Performing full DNS lookup for ${this.domain}`);
            const lookups = [
                this.getMX(),
                dns.resolve4(this.domain).catch(() => []),
                dns.resolve6(this.domain).catch(() => []),
                dns.resolveNs(this.domain).catch(() => [])
            ];
            const [mx, a4, a6, ns] = await Promise.all(lookups);
            this.mxRecords = mx;
            this.aRecords = a4;
            this.aaaaRecords = a6;
            this.nsRecords = ns;
        }
        return {
            mx: this.mxRecords,
            a: this.aRecords,
            aaaa: this.aaaaRecords,
            ns: this.nsRecords
        };
    }

    addResult(layer, result) {
        this.signals[layer] = result.data;
        if (result.score) this.score += result.score;
        if (result.message) this.reasons.push(result.message);
        if (result.isValid === false) this.isValid = false;
        
        logger.layer(layer, result.score || 0);
    }
}

module.exports = ValidationContext;
