const emailValidator = require('./index');

async function runTests() {
    const testEmails = [
        'nehyfegyjywih5@maximail.fyi',
        'gylujupemeh3@mail2me.co',
    ];

    console.log('============================================');
    console.log('🛡️ Advanced Email Validation Pipeline');
    console.log('============================================\n');

    for (const email of testEmails) {
        console.log(`🔍 Validating: ${email}`);
        const result = await emailValidator.validate(email);
        
        console.log(`   Overall Result: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Score: ${result.trust_score}/100`);
        console.log(`   Category: ${result.category}`);
        
        // Print key details
        Object.entries(result.signals).forEach(([key, detail]) => {
            const detailStr = detail ? JSON.stringify(detail) : 'null';
            console.log(`   ├─ ${key.padEnd(12)}: ${detailStr.substring(0, 100)}${detailStr.length > 100 ? '...' : ''}`);
        });
        console.log(`   Reasons: ${result.reasons.join(', ')}`);
        console.log('\n--------------------------------------------\n');
    }
}

runTests().catch(console.error);
