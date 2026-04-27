# 🛡️ DJ Infinity - Email Trust Engine

[![npm version](https://img.shields.io/npm/v/@bharat346/email-trust-engine.svg)](https://www.npmjs.com/package/@bharat346/email-trust-engine)
<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) -->

A highly robust, multi-layer email trust engine for Node.js. It evaluates email addresses beyond simple regex, performing real-time security analysis, infrastructure checks, and behavioral heuristics to generate a comprehensive **Trust Score**.

## 🌟 Key Features

-   🔍 **7-Layer Validation Pipeline**: From syntax to SMTP existence.
-   ⚡ **Fast-Pass Logic**: Instant validation for popular providers (Gmail, Outlook, etc.).
-   🛡️ **Security Analysis**: Deep SPF & DMARC verification, including MX authorization.
-   🎣 **Advanced Catch-all Detection**: Multi-probe SMTP analysis to identify "accept-all" domains.
-   📉 **Reputation Scoring**: Domain age analysis and DNSBL blacklist checks.
-   🧠 **Behavioral Heuristics**: Detection of random/generated local parts.
-   🚀 **High Performance**: Parallelized checks and optional Redis caching.

---

## 🧱 Architecture

The engine evaluates every email through a weighted scoring system:

1.  **Syntax (10%)**: RFC compliance and format verification.
2.  **DNS (25%)**: Validates MX, A, AAAA, and NS records.
3.  **Security (25%)**: SPF record content analysis and DMARC policy strength.
4.  **SMTP (15%)**: Real-time mailbox existence verification.
5.  **Reputation (15%)**: WHOIS domain age and global blacklist status.
6.  **Behavior (10%)**: Entropy checks and pattern analysis.

---

## 🚀 Installation

```bash
npm install @dj-infinity/email-trust-engine
```

## 💻 Usage

### Basic Usage

```javascript
const emailEngine = require('@dj-infinity/email-trust-engine');

async function validate() {
    const result = await emailEngine.validate('user@example.com');
    
    if (result.valid) {
        console.log(`Trust Score: ${result.trust_score}/100`);
        console.log(`Category: ${result.category}`);
    } else {
        console.log(`Email is invalid: ${result.reasons.join(', ')}`);
    }
}

validate();
```

### Advanced Configuration (Redis Caching)

The engine automatically uses Redis for caching if the environment variables are set:

```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## 📊 Classification Categories

| Category | Score | Description |
| :--- | :--- | :--- |
| **Trusted** | 80–100 | Verified mailbox on a reputable domain. |
| **Risky** | 50–79 | suspicious infrastructure or low-reputation history. |
| **Disposable** | 20–49 | Known temporary email provider. |
| **Invalid** | 0–19 | Fake mailbox, non-existent domain, or blacklisted. |

---

## 🚨 Auto-Fail Conditions

The system immediately marks an email as `INVALID` (Score < 20) if:
-   The domain has **No MX records**.
-   The domain is on a **Global Blacklist** (e.g., Spamhaus).
-   The domain is a known **Disposable Provider**.
-   The SMTP server explicitly rejects the recipient.

---

## API Reference

### `validate(email)`
The main entry point for the validation pipeline.
-   **Returns**: `Promise<Object>`
-   **Output Schema**:
    ```json
    {
      "email": "user@example.com",
      "valid": true,
      "trust_score": 85,
      "category": "trusted",
      "signals": { ... },
      "reasons": [ "Valid syntax", "Strong SPF policy", ... ]
    }
    ```

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

<!-- ## License

Distributed under the MIT License. See `LICENSE` for more information. -->

---
