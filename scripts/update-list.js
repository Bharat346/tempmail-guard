const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOMAINS_URL = 'https://raw.githubusercontent.com/tompec/disposable-email-domains/master/index.json';
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'domains.json');

async function updateList() {
    console.log('🚀 Fetching latest disposable email domains...');
    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const response = await axios.get(DOMAINS_URL);
        const domains = response.data;

        if (Array.isArray(domains)) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(domains, null, 2));
            console.log(`✅ Success! Updated list with ${domains.length} domains.`);
        } else {
            throw new Error('Invalid data format received from GitHub.');
        }
    } catch (error) {
        console.error('❌ Error updating domains list:', error.message);
        process.exit(1);
    }
}

updateList();
