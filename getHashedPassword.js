const readline = require("node:readline");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const hash = (password) => bcrypt.hash(password, SALT_ROUNDS);
const compare = (password, hashed) => bcrypt.compare(password, hashed);

function promptHidden(query) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
        });

        const onData = (char) => {
            const s = char.toString();
            if (s === "\n" || s === "\r" || s === "\u0004") {
                process.stdin.removeListener("data", onData);
                rl.output.write("\n");
                rl.close();
            } else if (s === "\u0003") {
                process.stdin.removeListener("data", onData);
                rl.output.write("\n");
                rl.close();
                process.exit();
            } else {
                rl.output.write("*");
            }
        };

        rl.question(query, (answer) => resolve(answer));
        process.stdin.on("data", onData);
    });
}

async function main() {
    const password = await promptHidden("Enter password: ");
    if (!password) {
        console.error("No password entered.");
        process.exit(1);
    }
    const hashed = await hash(password);
    console.log("\nHashed password:");
    console.log(hashed);

    const check = await promptHidden("\nRe-enter password to verify: ");
    const ok = await compare(check, hashed);
    console.log("\nMatch:", ok);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
