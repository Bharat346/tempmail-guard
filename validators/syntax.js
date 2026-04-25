const validator = require('validator');

module.exports = {
    name: 'syntax',
    validate: async (ctx) => {
        const email = ctx.email;
        const isValid = validator.isEmail(email);
        
        let message = 'Valid email syntax';
        if (!isValid) {
            const hasAt = email.includes('@');
            const multipleAt = (email.match(/@/g) || []).length > 1;
            const hasDomain = ctx.domain && ctx.domain.includes('.');

            if (!hasAt) message = 'Missing @ symbol';
            else if (multipleAt) message = 'Multiple @ symbols detected';
            else if (!hasDomain) message = 'Invalid domain part';
            else message = 'RFC non-compliant email format';
        }

        return {
            isValid,
            score: isValid ? 10 : 0,
            message,
            data: { 
                email,
                isValid
            }
        };
    }
};
