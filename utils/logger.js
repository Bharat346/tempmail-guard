const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

class Logger {
    info(msg,tag="INFO") {
        console.log(`${COLORS.fg.cyan}[${tag}]${COLORS.reset} ${msg}`);
    }
    
    success(msg,tag="SUCCESS") {
        console.log(`${COLORS.fg.green}[${tag}]${COLORS.reset} ${msg}`);
    }
    
    warn(msg,tag="WARN") {
        console.log(`${COLORS.fg.yellow}[${tag}]${COLORS.reset} ${msg}`);
    }
    
    error(msg,tag="ERROR") {
        console.log(`${COLORS.fg.red}[${tag}]${COLORS.reset} ${msg}`);
    }

    debug(msg,tag="DEBUG") {
        console.log(`${COLORS.dim}[${tag}]${COLORS.reset} ${msg}`);
    }
    
    layer(name, score) {
        const color = score >= 0 ? COLORS.fg.green : COLORS.fg.red;
        console.log(`${COLORS.bright}${COLORS.fg.magenta}[LAYER]${COLORS.reset} ${name.padEnd(12)} | Score: ${color}${score}${COLORS.reset}`);
    }
}

module.exports = new Logger();
