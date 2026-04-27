/**
 * Security Layer: Robust SPF & DMARC analysis using context.
 */
const TRUSTED_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];

module.exports = {
    name: 'security',
    validate: async (ctx) => {
        const txtRecords = await ctx.getTXT();
        const results = {
            spf: null,
            spf_mechanisms: {
                ip4: [],
                ip6: [],
                include: [],
                all: null
            },
            dmarc: null,
            external_reporting: false
        };

        let score = 0;
        const reasons = [];

        // 1. SPF Analysis
        const spfRecord = txtRecords.find(r => r.startsWith('v=spf1'));
        if (spfRecord) {
            results.spf = spfRecord;
            const parts = spfRecord.split(' ');
            
            let hasIp4 = false;
            let hasIp6 = false;
            let hasInclude = false;

            for (const part of parts) {
                if (part.startsWith('ip4:')) {
                    const val = part.split(':')[1];
                    if (val) {
                        results.spf_mechanisms.ip4.push(val);
                        hasIp4 = true;
                    }
                } else if (part.startsWith('ip6:')) {
                    const val = part.split(':')[1];
                    if (val) {
                        results.spf_mechanisms.ip6.push(val);
                        hasIp6 = true;
                    }
                } else if (part.startsWith('include:')) {
                    const val = part.split(':')[1];
                    if (val) {
                        results.spf_mechanisms.include.push(val);
                        hasInclude = true;
                    }
                } else if (part.includes('all')) {
                    results.spf_mechanisms.all = part;
                    if (part === '-all') {
                        score += 15;
                        reasons.push('Strong SPF policy (-all)');
                    } else if (part === '~all') {
                        score += 10;
                        reasons.push('Soft SPF policy (~all)');
                    } else if (part === '+all') {
                        score -= 25;
                        reasons.push('Dangerous SPF policy (+all)');
                    }
                }
            }

            // SPF record content validation
            if (hasIp4 || hasIp6 || hasInclude) {
                // score += 5;
                reasons.push('SPF contains valid mechanisms (ip4/ip6/include)');
                
                // Cross-check with mailserver (MX) IP
                try {
                    const mxRecords = await ctx.getMX();
                    if (mxRecords && mxRecords.length > 0) {
                        const dns = require('dns').promises;
                        let isAuthorized = false;

                        // Check ALL MX records, not just the first one
                        for (const mx of mxRecords) {
                            const exchange = mx.exchange;
                            if (!exchange) continue;

                            const [mxIps4, mxIps6] = await Promise.all([
                                dns.resolve4(exchange).catch(() => []),
                                dns.resolve6(exchange).catch(() => [])
                            ]);

                            // 1. Check ALL IPv4 addresses for this MX
                            for (const mxIp of mxIps4) {
                                if (results.spf_mechanisms.ip4.some(range => range === mxIp || mxIp.startsWith(range.split('/')[0]))) {
                                    isAuthorized = true;
                                    break;
                                }
                            }
                            if (isAuthorized) break;

                            // 2. Check ALL IPv6 addresses for this MX
                            for (const mxIp6 of mxIps6) {
                                if (results.spf_mechanisms.ip6.some(range => range === mxIp6 || mxIp6.toLowerCase().startsWith(range.split('/')[0].toLowerCase()))) {
                                    isAuthorized = true;
                                    break;
                                }
                            }
                            if (isAuthorized) break;

                            // 3. Check 'include' mechanisms against this MX hostname
                            if (results.spf_mechanisms.include.some(inc => exchange.toLowerCase().includes(inc.toLowerCase()))) {
                                isAuthorized = true;
                                break;
                            }
                        }
                        
                        if (isAuthorized) {
                            score += 10;
                            reasons.push('MX server(s) authorized by SPF');
                        }
                    }
                } catch (e) {
                    // Ignore resolution errors for MX IP cross-check
                }
            } else {
                score -= 5;
                reasons.push('SPF missing specific mechanisms (ip4, ip6, or include)');
            }

            if (reasons.length === 0) {
                score += 5;
                reasons.push('Valid SPF found');
            }
        } else {
            score -= 15;
            reasons.push('SPF record missing');
        }

        // 2. DMARC Analysis
        const dns = require('dns').promises;
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${ctx.domain}`).catch(() => []);
        const dmarcRecord = dmarcRecords.flat().find(r => r.startsWith('v=DMARC1'));

        if (dmarcRecord) {
            results.dmarc = dmarcRecord;
            if (dmarcRecord.includes('p=reject')) {
                score += 10;
                reasons.push('DMARC strict (reject)');
            } else if (dmarcRecord.includes('p=quarantine')) {
                score += 7;
                reasons.push('DMARC moderate (quarantine)');
            } else {
                score -= 10;
                reasons.push('DMARC policy is none');
            }

            const reportMatch = dmarcRecord.match(/rua=mailto:([^;@]+@([^;>]+))/);
            if (reportMatch && reportMatch[2] !== ctx.domain) {
                results.external_reporting = true;
                // Ignore penalty for trusted domains (they often use external reporting)
                if (!TRUSTED_DOMAINS.includes(ctx.domain)) {
                    score -= 20;
                    reasons.push('External DMARC reporting detected');
                }
            }
        } else {
            score -= 10;
            reasons.push('DMARC missing');
        }

        return {
            isValid: true,
            score,
            message: reasons.join(', '),
            data: results
        };
    }
};
