module.exports = {
    name: 'behavior',
    validate: async (ctx) => {
        const localPart = ctx.localPart;
        const domain = ctx.domain;
        let score = 10;
        const reasons = [];
        const signals = { isRandom: false, hasKeywords: false };

        // 1. Randomness
        const vowels = (localPart.match(/[aeiou]/gi) || []).length;
        const consonants = (localPart.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
        if (localPart.length > 10 && (consonants / localPart.length) > 0.8) {
            signals.isRandom = true;
            score -= 10;
            reasons.push('High consonant ratio');
        }

        // 2. Keywords
        const keywords = ['temp', 'trash', 'fake', 'disposable', 'throwaway', 'spam', 'test'];
        const found = keywords.filter(kw => localPart.includes(kw) || domain.includes(kw));
        if (found.length > 0) {
            signals.hasKeywords = true;
            score -= 20;
            reasons.push(`Suspicious keywords: ${found.join(', ')}`);
        }

        if (score === 10) reasons.push('Normal pattern');

        return {
            isValid: true,
            score: Math.max(-30, score),
            message: reasons.join(', '),
            data: signals
        };
    }
};
