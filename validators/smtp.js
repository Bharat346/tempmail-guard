const net = require('net');

module.exports = {
    name: 'smtp',
    validate: async (ctx) => {
        const mxRecords = await ctx.getMX();
        if (!mxRecords || mxRecords.length === 0) {
            return { isValid: false, score: 0, message: 'No MX records for SMTP check', data: {} };
        }

        const exchange = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

        return new Promise((resolve) => {
            const socket = net.createConnection(25, exchange);
            let result = { isValid: false, score: 0, message: 'SMTP Check Timeout', status: 'timeout' };

            socket.setTimeout(10000);

            const commands = [
                `HELO mail.google.com\r\n`,
                `MAIL FROM:<antigravity-verify@gmail.com>\r\n`,
                `RCPT TO:<${ctx.email}>\r\n`,
                `QUIT\r\n`
            ];

            let step = 0;
            socket.on('data', (data) => {
                const response = data.toString();
                const code = parseInt(response.substring(0, 3));

                if (code >= 400 && step < 3) {
                    // Check if the rejection is due to OUR IP being blocked (Spamhaus, etc)
                    const isClientBlock = response.toLowerCase().includes('spamhaus') || 
                                        response.toLowerCase().includes('blocked') ||
                                        response.toLowerCase().includes('service unavailable');

                    result = { 
                        isValid: isClientBlock, // If WE are blocked, don't mark the EMAIL as invalid
                        score: 0, 
                        message: `SMTP Rejected: ${response.trim()}`, 
                        status: isClientBlock ? 'client_blocked' : 'rejected',
                        code
                    };
                    socket.end();
                    return;
                }

                if (step < commands.length) {
                    socket.write(commands[step]);
                    if (step === 2) { 
                        if (code === 250) {
                            result = { isValid: true, score: 10, message: 'Mailbox exists', status: 'ok', code };
                        } else {
                            result = { isValid: false, score: 0, message: `Mailbox invalid (${code})`, status: 'invalid', code };
                        }
                    }
                    step++;
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                resolve({ isValid: true, score: 0, message: `SMTP Error: ${err.message}`, status: 'error' });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ isValid: true, score: 0, message: 'SMTP Timeout', status: 'timeout' });
            });

            socket.on('close', () => {
                if (!socket.destroyed) socket.destroy();
                resolve({ ...result, data: result });
            });

            // Ensure we resolve if something goes wrong and no events fire
            setTimeout(() => {
                if (!socket.destroyed) {
                    socket.destroy();
                    resolve({ isValid: true, score: 0, message: 'SMTP Global Timeout', status: 'timeout' });
                }
            }, 12000);
        });
    }
};
