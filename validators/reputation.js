const whois = require('whois-json');
const dns = require('dns').promises;

const BLACKLISTS = [
    'zen.spamhaus.org',
    'bl.spamcop.net',
    'b.barracudacentral.org',
    'dnsbl.sorbs.net'
];

module.exports = {
    name: 'reputation',
    validate: async (ctx) => {
        const domain = ctx.domain;
        const results = {
            ageInDays: null,
            isBlacklisted: false,
            isTrusted: false,
            localBlacklist: false
        };

        let score = 0;
        const reasons = [];

        // 1. Trusted Domains
        const trustedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
        if (trustedDomains.includes(domain)) {
            results.isTrusted = true;
            score += 10;
            reasons.push('Trusted major provider');
        }

        // 2. Local Blacklist Check (domains.json)
        if (ctx.isDomainInBlacklist(domain)) {
            results.localBlacklist = true;
            results.isBlacklisted = true;
            score -= 50;
            reasons.push('Domain found in local blacklist');
        }

        // 3. WHOIS Age
        try {
            const data = await whois(domain);
            const created = data.creationDate || data.created || data.creationDateTimestamp;
            if (created) {
                const ageInDays = (new Date() - new Date(created)) / (1000 * 60 * 60 * 24);
                results.ageInDays = Math.floor(ageInDays);
                if (ageInDays < 30) {
                    score -= 20;
                    reasons.push(`New domain (${results.ageInDays} days)`);
                } else if (ageInDays > 365) {
                    score += 5;
                    reasons.push('Established domain');
                }
            }
        } catch (e) {}

        // 4. DNSBL Check
        if (!results.isBlacklisted) { // Only check remote if not already locally blacklisted
            const blChecks = BLACKLISTS.map(async (bl) => {
                try {
                    await dns.resolve(`${domain}.${bl}`);
                    return bl;
                } catch (e) {
                    return null;
                }
            });
            const found = (await Promise.all(blChecks)).filter(b => b !== null);
            if (found.length > 0) {
                results.isBlacklisted = true;
                score -= 50;
                reasons.push(`Blacklisted on remote DNSBL: ${found.join(', ')}`);
            }
        }

        return {
            isValid: !results.isBlacklisted,
            score,
            message: reasons.join(', '),
            data: results
        };
    }
};
