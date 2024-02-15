'use strict';

const
	u = `\u2B24 `, // pacman
	h = `\u001B[?25l`, // hide cursor
	sh = `\u001B[?25h`, // show cursor
	c = require(`ansi-colors`).theme({y: require(`ansi-colors`).bold.yellow}),
	rl = require(`node:readline`),
	rli = rl.createInterface(process.stdin, process.stdout),
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
			for await (const s of t) {
				rli.write(h);

				rl.clearLine();
				rl.cursorTo(process.stdout, 0);
				
				rli.write(s);
				
				await sleep(500);
			}
		}
	},
	pause: () => {
		status = false;

		rl.write(sh);
	},
	stop: () => {
		status = false;

		rl.clearLine();
		rl.cursorTo(process.stdout, 0);

		rli.write(sh);
	},
};