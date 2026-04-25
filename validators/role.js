const ROLE_PREFIXES = new Set([
    'admin', 'webmaster', 'support', 'info', 'sales', 'contact', 'help', 
    'no-reply', 'noreply', 'billing', 'jobs', 'hr', 'marketing', 'dev'
]);

module.exports = {
    name: 'role',
    validate: async (ctx) => {
        const isRole = ROLE_PREFIXES.has(ctx.localPart.toLowerCase());
        return {
            isValid: true,
            score: isRole ? -10 : 0,
            message: isRole ? 'Role-based email' : 'Individual email',
            data: { isRole }
        };
    }
};
