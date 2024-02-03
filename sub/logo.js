const
	u = `\u2B24 `,
	rl = require(`readline`),
	c = require(`ansi-colors`).theme({y: require(`ansi-colors`).bold.yellow}),
	sleep = (ms) => {return new Promise((resolve) => {setTimeout(resolve, ms)})},
	t = [
		`ti${c.y(u)}kly`,
		`ti ${c.y(u)}ly`,
		`ti  ${c.y(u)}y`,
		`ti   ${c.y(u)}`,
		`ti${c.y(u)}   `,
		`ti${c.y(u)}k  `,
		`ti${c.y(u)}kl `,
		`ti${c.y(u)}kly`,
	]
;

let status = true;

module.exports = {
	start: async () => {
		while (status) {
			for await (const state of t) {
				process.stdout.write(state);

				await sleep(500);

				// rl.moveCursor(0, -1);
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
			}
		}
	},
	stop: () => {
		status = false;

		// rl.moveCursor(0, -1);
		rl.clearLine();
		rl.clearLine();
	},	
};