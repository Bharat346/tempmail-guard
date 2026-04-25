const emailValidator = require('./index');

async function runTests() {
    const testEmails = [
        // 'user@gmail.com',
        // 'invalid-email.com',
        // 'test@10minutemail.com',
        // 'admin@google.com',
        // 'nonexistent-mailbox@gmail.com',
        'wokowa7948@ryzid.com'
    ];

    console.log('============================================');
    console.log('🛡️ Advanced Email Validation Pipeline');
    console.log('============================================\n');

    for (const email of testEmails) {
        console.log(`🔍 Validating: ${email}`);
        const result = await emailValidator.validate(email);
        
        console.log(`   Overall Result: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Score: ${result.score}/100`);
        
        // Print key details
        Object.entries(result.details).forEach(([key, detail]) => {
            const status = detail.isValid ? '✅' : '❌';
            console.log(`   ├─ ${key.padEnd(12)}: ${status} ${detail.message}`);
        });
        console.log('\n--------------------------------------------\n');
    }
}

runTests().catch(console.error);
