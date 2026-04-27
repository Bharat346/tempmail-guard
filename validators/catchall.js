const smtp = require('./smtp');
const crypto = require('crypto');

module.exports = {
    name: 'catchall',

    validate: async (ctx) => {
        const domain = ctx.domain;
        const results = [];
        const randomEmails = Array.from({ length: 3 }, () => `verify-${crypto.randomBytes(8).toString('hex')}@${domain}`);

        try {
            // Perform SMTP validation for each random email
            for (const email of randomEmails) {
                const dummyCtx = {
                    email,
                    domain,
                    getMX: () => ctx.getMX()
                };
                const res = await smtp.validate(dummyCtx);
                results.push(res);
            }

            // A domain is a catch-all if ALL random emails are accepted
            const acceptedCount = results.filter(r => r.status === 'ok').length;
            const isCatchAll = acceptedCount === randomEmails.length;

            // EXTRA SAFETY: avoid false positives on major providers
            const trustedProviders = [
                'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'
            ];

            let score = 5;
            let message = 'Not a catch-all domain';
            
            if (isCatchAll && !trustedProviders.includes(domain)) {
                score = -20;
                message = `Catch-all domain detected (${acceptedCount}/${randomEmails.length} accepted)`;
            } else if (acceptedCount > 0 && acceptedCount < randomEmails.length) {
                score = -10;
                message = `Partial catch-all/Graylisting detected (${acceptedCount}/${randomEmails.length} accepted)`;
            }

            return {
                isValid: true,
                score,
                message,
                data: {
                    isCatchAll: isCatchAll && !trustedProviders.includes(domain),
                    acceptedCount,
                    totalTested: randomEmails.length,
                    results
                }
            };

        } catch (error) {
            return {
                isValid: true,
                score: 0,
                message: 'Catch-all check failed',
                data: { error: error.message }
            };
        }
    }
};