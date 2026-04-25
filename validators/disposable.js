module.exports = {
    name: 'disposable',
    validate: async (ctx) => {
        const isDisposable = ctx.isDomainInBlacklist(ctx.domain);

        return {
            isValid: !isDisposable,
            score: isDisposable ? -50 : 0,
            message: isDisposable ? 'Disposable provider' : 'Not disposable',
            data: { isDisposable }
        };
    }
};
