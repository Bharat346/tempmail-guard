const Redis = require("ioredis");
const ValidationContext = require("./utils/context");
const logger = require("./utils/logger");

// Validators
const syntax = require("./validators/syntax");
const dns = require("./validators/dns");
const security = require("./validators/security");
const smtp = require("./validators/smtp");
const reputation = require("./validators/reputation");
const behavior = require("./validators/behavior");
const role = require("./validators/role");
const disposable = require("./validators/disposable");
const catchall = require("./validators/catchall");

class EmailTrustEngine {
  constructor() {
    this.redis = null;
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.redis.on("error", () => {});
    } catch (e) {}
  }

  async validate(email) {
    if (!email) throw new Error("Email is required");

    // 1. Cache Check
    if (this.redis && this.redis.status === "ready") {
      const cached = await this.redis.get(`v3:email:${email}`);
      if (cached) {
        logger.success(`Cache hit for ${email}`);
        return JSON.parse(cached);
      }
    }

    logger.info(`Starting validation for: ${email}`,"INIT");
    const ctx = new ValidationContext(email);

    // --- LAYER 1: SYNTAX (Synchronous/Cheapest) ---
    const syntaxRes = await syntax.validate(ctx);
    ctx.addResult("syntax", syntaxRes);
    if (!ctx.isValid) return this.finalize(ctx, "Invalid syntax");

    // --- LAYER 2: DNS (Pre-requisite for others) ---
    const dnsRes = await dns.validate(ctx);
    ctx.addResult("dns", dnsRes);
    if (!ctx.mxRecords || ctx.mxRecords.length === 0) {
      return this.finalize(ctx, "No MX records found");
    }

    const parallelLayers = [
      security.validate(ctx),
      reputation.validate(ctx),
      behavior.validate(ctx),
      role.validate(ctx),
      disposable.validate(ctx),
    ];

    const results = await Promise.all(parallelLayers);
    ctx.addResult("security", results[0]);
    ctx.addResult("reputation", results[1]);
    ctx.addResult("behavior", results[2]);
    ctx.addResult("role", results[3]);
    ctx.addResult("disposable", results[4]);

    // SMTP and Catch-all
    const smtpRes = await smtp.validate(ctx);
    ctx.addResult("smtp", smtpRes);

    const catchallRes = await catchall.validate(ctx);
    ctx.addResult("catchall", catchallRes);

    // Auto-fail conditions
    let autoFail = null;
    if (ctx.signals.reputation.isBlacklisted)
      autoFail = "Domain is blacklisted";
    else if (ctx.signals.disposable.isDisposable)
      autoFail = "Disposable email provider";
    else if (!ctx.signals.smtp.isValid && ctx.signals.smtp.status === "invalid")
      autoFail = "Mailbox does not exist";

    return this.finalize(ctx, autoFail);
  }

  async finalize(ctx, autoFailReason) {
    if (autoFailReason) {
      ctx.isValid = false;
      ctx.reasons.unshift(autoFailReason);
    }

    // CAP SCORE IF INVALID
    if (!ctx.isValid) {
      ctx.score = Math.min(ctx.score, 19);
    }

    const trust_score = Math.max(0, Math.min(100, ctx.score));

    let category = "risky";
    if (!ctx.isValid) category = "invalid";
    else if (trust_score >= 70) category = "trusted";
    else if (trust_score >= 50) category = "risky";
    else if (trust_score >= 20) category = "disposable";
    else category = "invalid";

    const finalResult = {
      email: ctx.email,
      valid: ctx.isValid,
      trust_score,
      category,
      signals: ctx.signals,
      reasons: [...new Set(ctx.reasons)],
    };

    if (this.redis && this.redis.status === "ready") {
      await this.redis.set(
        `v3:email:${ctx.email}`,
        JSON.stringify(finalResult),
        "EX",
        86400,
      );
    }

    logger.success(
      `Validation complete for ${ctx.email}. Score: ${trust_score} (${category})`
    );
    return finalResult;
  }
}

module.exports = new EmailTrustEngine();
