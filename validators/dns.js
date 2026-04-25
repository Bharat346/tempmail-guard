/**
 * Validates domain existence, MX, A, AAAA, and NS records using context.
 */
module.exports = {
    name: 'dns',
    validate: async (ctx) => {
        try {
            const records = await ctx.getDNS();
            
            let score = 0;
            let message = '';
            let isValid = true;

            if (records.mx.length > 0) {
                score += 10;
                message += 'MX records found. ';
            } else {
                isValid = false;
                message += 'No MX records found. ';
            }

            if (records.a.length > 0 || records.aaaa.length > 0) {
                score += 5;
                message += 'A/AAAA records found. ';
            }

            if (records.ns.length === 0 && records.mx.length === 0) {
                score -= 25;
                message += 'Broken DNS (No NS or MX). ';
            }

            return {
                isValid,
                score,
                message: message.trim(),
                data: records
            };

        } catch (error) {
            return {
                isValid: false,
                score: -25,
                message: `DNS lookup failed: ${error.message}`,
                data: { error: error.code }
            };
        }
    }
};