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
            
            for (const part of parts) {
                if (part.startsWith('ip4:')) results.spf_mechanisms.ip4.push(part.split(':')[1]);
                else if (part.startsWith('ip6:')) results.spf_mechanisms.ip6.push(part.split(':')[1]);
                else if (part.startsWith('include:')) results.spf_mechanisms.include.push(part.split(':')[1]);
                else if (part.includes('all')) {
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
                    score -= 5;
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
