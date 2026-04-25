const engine = require('./pipeline');
const logger = require('./utils/logger');

/**
 * Main entry point for the Email Validation & Trust Scoring System.
 */
module.exports = {
    validate: (email) => engine.validate(email),
    layers: {
        syntax: require('./validators/syntax'),
        dns: require('./validators/dns'),
        security: require('./validators/security'),
        smtp: require('./validators/smtp'),
        reputation: require('./validators/reputation'),
        behavior: require('./validators/behavior'),
        role: require('./validators/role'),
        disposable: require('./validators/disposable'),
        catchall: require('./validators/catchall')
    }
};

if (require.main === module) {
    const email = process.argv[2];

    if (!email) {
        console.log("Please provide an email address to validate.");
        console.log("Usage: node index.js <email_address>");
        process.exit(1);
    }

    logger.info(`=================INITIALIZING PIPELINE===================`);

    engine.validate(email)
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
            logger.success(`=================PIPELINE ENDED===================`);
        })
        .catch(err => {
            console.error('Validation failed:', err);
        });
}
