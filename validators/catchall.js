const smtp = require('./smtp');
const crypto = require('crypto');

module.exports = {
    name: 'catchall',

    validate: async (ctx) => {
        const domain = ctx.domain;

        const randomEmail = `verify-${crypto.randomBytes(12).toString('hex')}@${domain}`;
        const knownEmail = `test@${domain}`;

        try {

            const dummyRandom = {
                email: randomEmail,
                getMX: () => ctx.getMX()
            };

            const dummyKnown = {
                email: knownEmail,
                getMX: () => ctx.getMX()
            };

            const randomResult = await smtp.validate(dummyRandom);
            const knownResult = await smtp.validate(dummyKnown);

            let isCatchAll = false;

            // TRUE catch-all condition
            if (
                randomResult.status === 'ok' &&
                knownResult.status === 'ok'
            ) {
                isCatchAll = true;
            }

            // EXTRA SAFETY: avoid false positives on major providers
            const trustedProviders = [
                'gmail.com',
                'outlook.com',
                'hotmail.com',
                'yahoo.com'
            ];

            if (trustedProviders.includes(domain)) {
                isCatchAll = false;
            }

            return {
                isValid: true,
                score: isCatchAll ? -20 : 5,
                message: isCatchAll ? 'Catch-all domain detected' : 'Not a catch-all domain',
                data: {
                    isCatchAll,
                    randomResult,
                    knownResult
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