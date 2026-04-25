# Email Validation & Trust Scoring System 🛡️

A highly robust, multi-layer email trust engine that evaluates email addresses beyond syntax.

## 🧱 Architecture

The system uses a 7-layer validation pipeline:

1.  **Syntax Validation (10%)**: RFC compliance and format checks.
2.  **DNS Infrastructure (25%)**: Validates MX, A, AAAA, and NS records.
3.  **Security Layer (25%)**: SPF, DKIM, and DMARC verification.
4.  **SMTP Verification (15%)**: Real-time mailbox existence check.
5.  **Domain Reputation (15%)**: WHOIS age and DNSBL blacklist checks.
6.  **Behavioral Intelligence (10%)**: Pattern analysis and entropy heuristics.
7.  **Special Signals**: Role-based detection and Catch-all detection.

## 📊 Classification Rules

| Score | Category | Description |
| :--- | :--- | :--- |
| 80–100 | **Trusted** | Highly reliable individual email. |
| 50–79 | **Risky** | Potentially suspicious or low-reputation domain. |
| 20–49 | **Low Trust** | Disposable or catch-all email. |
| 0–19 | **Invalid** | Fake mailbox or blacklisted domain. |

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Redis (Optional, for caching)

### Installation
```bash
npm install
```

### Usage
```javascript
const emailTrust = require('./index');

const result = await emailTrust.validate('user@example.com');
console.log(result);
```

### CLI Test
```bash
node index.js user@example.com
```

## 🚨 Auto-Fail Conditions
The system immediately marks an email as **INVALID** if:
- No MX records exist for the domain.
- The domain is found on major blacklists (Spamhaus, etc.).
- The domain is a known disposable provider.
- SMTP explicitly rejects the mailbox.

## 🧠 Features
- **Explainable AI**: Detailed reasoning for every score.
- **Async Processing**: Fast, parallelized checks.
- **Caching**: Redis integration for high-performance repeat checks.
- **Modular Design**: Each validator can be used independently.
