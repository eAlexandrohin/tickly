require(`dotenv`).config();

const
	yargs = require(`yargs`),
	c = require(`ansi-colors`),
	moment = require(`moment`),
	fs = require(`fs`),
	enquirer = require(`enquirer`),
	spinner = require(`ora`)({text: `Loading...`, color: `magentaBright`}),
	open = require(`open`),
	chalk = require(`chalk`),
	twitch_m3u8 = require(`twitch-m3u8`),
	ncp = require(`copy-paste`),
	cliProgress = require(`cli-progress`),
	downloader = require(`nodejs-file-downloader`),
	m3u8ToMp4 = require(`m3u8-to-mp4-progress`),
	commandExistsSync = require(`command-exists`).sync,
	docFolder = `${require(`os`).userInfo().homedir}\\Documents\\tickly`
;

// todo:
// make use of users chat color
const
	version = `v3.0.0`,
	build = `2023-08-29T21:50:51.888Z` // build time
;

const f = {
	GET: (path) => new Promise((resolve, reject) => {
		fetch(`https://api.twitch.tv/helix/${path}`, {method: `GET`,
			headers: {
				"client-id": process.env.CLIENT,
				"authorization": `Bearer ${auth.token}`,
			}
		})
		.then((response) => response.json())
		.then((data) => resolve(data))
		.catch((error) => reject(error))
	}),
	checkInternet: () => new Promise((resolve, reject) => {
		require(`dns`).resolve(`www.google.com`, (err) => (err) ? f.returnError(`no internet`) : resolve(true));
	}),
	checkUpdates: () => new Promise((resolve, reject) => {
		fetch(`https://api.github.com/repos/ealexandrohin/tickly/releases`, {method: `GET`})
		.then((response) => response.json())
		.then((data) => (data.hasOwnProperty(`message`)) ? console.log(`${c.bold.redBright(`Error`)}: repo is not found.`) : (data[0].tag_name === version) ? resolve(true) : console.log(`Update avaliable: ${c.bold.redBright(data[0].tag_name)}\nYou can update by running: ${c.bgMagenta.italic(`tickly update`)}\nSee: ${c.yellowBright.underline(`https://github.com/ealexandrohin/tickly/releases/latest`)}`));
	}),
	checkAuth: () => new Promise((resolve, reject) => {
		fetch(`https://api.twitch.tv/helix/users`, {method: `GET`,
			headers: {
				"client-id": process.env.CLIENT,
				"authorization": `Bearer ${auth.token}`,
			}
		})
		.then((response) => response.json())
		.then((data) => {
			if (data.error === `Unauthorized`) {
				if (auth.hasOwnProperty(`token`) && auth.hasOwnProperty(`refresh`)) {
					fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT}&client_secret=${process.env.SECRET}&grant_type=refresh_token&refresh_token=${auth.refresh}`, {method: `POST`})
					.then((response) => response.json())
					.then((data) => {
						console.log(`yo`, data);

						auth.token = data.access_token;
						auth.refresh = data.refresh_token;

						if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder);
						fs.writeFileSync(`${docFolder}\\auth.json`, JSON.stringify(auth, null, 4));
					});
				} else {f.returnError(`no auth`)};
			};

			resolve(true);
		});
	}),
	checkURLs: (links) => {
		let count = 0;

		for (link of links) {
			try {
				const url = new URL(link);

				count++;
			} catch (error) {
				spinner.stop();

				f.returnError(`#${count} is broken`);
			};
		};

		return true;
	},
	title: (t, full, max) => {
		return ((!full && t.length) < (max || 64)) || ((full && t.length) >= (max || 64)) ? t.replace(/\r?\n|\r/g, `\s`).trim() : t.replace(/\r?\n|\r/g, `\s`).substring(0, max || 64).trim() + `...`;
	},
	streamedTime: (start) => {
		return new Date(new Date() - new Date(start)).toLocaleTimeString();
	},
	getDate: (timeperiod) => {
		const timetable = {
			"d": 1,
			"w": 7,
			"m": 30,
			"y": 365,
		};

		return moment().subtract(timetable[timeperiod], `days`).toISOString();
	},
	getClip: (link) => {
		return link.split(`-`).slice(0, -2).join(`-`) + `.mp4`;
	},
	getClipID: (link) => {
		const url = new URL(link);

		return (url.hostname === `clips.twitch.tv`) ? url.pathname.substring(1) : url.pathname.split(`/`)[3];
	},
	getVod: (link, quality) => {
		const 
			useful = link.split(`/`).slice(4, 6),
			q = {
				"source": `chunked`,
				"1080p60": `chunked`,
				"720p60": `720p60`,
				"720p": `720p30`,
				"480p": `480p30`,
				"360p": `360p30`,
				"160p": `160p30`,
			}
		;

		return `https://${useful[0]}.cloudfront.net/${useful[1]}/${q[quality]}/index-dvr.m3u8`
	},
	getVodID: (link) => {
		return new URL(link).pathname.split(`/`)[2];
	},
	getDir: () => {
		return (process.pkg) ? require(`path`).resolve(process.execPath + `/..`) : require(`path`).join(require.main ? require.main.path : process.cwd());
	},
	returnError: (message) => {
		console.log(`${c.bold.redBright(`Error`)}: ${message}.`);
		process.exit(1);
	},
	copy: async (values) => {
		for (const value of values) {
			ncp.copy(value);
			await ((ms) => {return new Promise(resolve => setTimeout(resolve, ms))})(1000);
		};
	},
};

// auth
let auth;
if (!fs.existsSync(`${docFolder}\\auth.json`) && (!process.argv[2] || process.argv[2].toLowerCase() != `auth`)) {f.returnError(`no auth`)};
if (fs.existsSync(`${docFolder}\\auth.json`)) {auth = require(`${docFolder}\\auth.json`)};

// MAIN ENTRY POINT
try {
	yargs

	.check(async (argv) => {
		if (argv._[0] === `auth`) {return true};
		if (argv.themeYellow) globalThis.themeYellow = true;

		if (await f.checkInternet() /*&& await f.checkUpdates()*/ && await f.checkAuth()) {return true} 
		else {return false};
	}, true)
	.usage(`use \`[command] -h\` for details`)
	.command(`$0`, `returns followed live streams`, (yargs) => {
		yargs.options({
			"cp": {
				boolean: true,
				desc: `copy selected streams`,
				required: false,
				alias: [`c`, `copy`],
			},
			"op": {
				boolean: true,
				desc: `open selected streams`,
				required: false,
				alias: [`o`, `open`],
			},
			"full": {
				boolean: true,
				desc: `show full titles`,
				required: false,
				alias: `f`,
			},
			"quality": {
				boolean: true,
				desc: `choose quality`,
				required: false,
				alias: `q`,
			},
		});
	},
		(yargs) => {
			spinner.start();

			f.GET(`streams/followed?user_id=${auth.id}`)
			.then((streams) => {
				spinner.stop();

				const choices = [];

				if (streams.data.length === 0) {console.log(`${c.bold.cyanBright(`No one is live...`)}\n${c.bold.grey(`Sadge`)}`)}
				else {
					for (stream of streams.data) {
						const output = `${c.bold.magentaBright(stream.user_name)} --- ${stream.game_name} --- ${f.streamedTime(stream.started_at)} --- ${c.bold.redBright(stream.viewer_count)}\n\t>>>${f.title(stream.title, yargs.full)}`;

						(yargs.cp || yargs.op) ? choices.push({name: output, value: stream}) : console.log(output);
					};
				};

				if (yargs.cp || yargs.op) {
					// yeah shoudve not duplicate
					// but tried creating new custom prompt type
					// from default enquirer type and got an error
					// reported it https://github.com/enquirer/enquirer/issues/428
					// lets see how it goes

					// got an update https://github.com/enquirer/enquirer/issues/428#issuecomment-1655617337
					// and it seems like its not worth it 
					// and the indicator doesnt work 
					// so sticking with creating new prompt every time
					enquirer.prompt({
						type: `multiselect`,
						name: `chosenStreams`,
						message: `Choose streams:`,
						limit: yargs.amount,
						choices: choices,
						pointer: `>`,
						emptyError: `${c.bold.redBright(`none were selected.`)}`,
						footer: `\nUse ${c.bold.cyanBright(`↑/↓`)} keys with ${c.bold.cyanBright(`Space[ ⎵ ]`)} and ${c.bold.cyanBright(`Enter[ ↵ ]`)}.`,
						styles: {
							default: chalk.reset,
							strong: chalk.bold.cyanBright,
							primary: chalk.bold.greenBright,
							em: chalk.bold.greenBright,
							success: chalk.bold.greenBright,
						},
						indicator (state, choice) {
							return ` ${choice.enabled ? `●` : `○`}`;
						},
						result (result) {
							return Object.values(this.map(result));
						},
						format() {
							if (!this.state.submitted || this.state.cancelled) return ``;
							if (Array.isArray(this.selected) && this.selected.length > 0) {
								return c.bold.greenBright(`done!`);
							};
						},
					})
					.then(async (result) => {
						switch (true) {
							case yargs.cp:
								spinner.start();

								const copies = [];

								for await (stream of result.chosenStreams) {
									await twitch_m3u8.getStream(stream.user_login).then(async (qualities) => {
										if (yargs.quality) {
											const qls = [];

											for (quality of qualities) {
												qls.push({message: `${quality.quality} ::: ${quality.resolution}`, name: quality.url})
											};

											spinner.stop();

											await enquirer.prompt({
												type: `Select`,
												name: `chosenQuality`,
												message: `Choose quality:`,
												// values in choices in Select prompt doesnt work
												// need to report it
												choices: qls,
												pointer: `>`,
												emptyError: `${c.bold.redBright(`none were selected.`)}`,
												footer: `\nUse ${c.bold.cyanBright(`↑/↓`)} keys and ${c.bold.cyanBright(`Enter[ ↵ ]`)}.`,
												styles: {
													default: chalk.reset,
													strong: chalk.bold.cyanBright,
													primary: chalk.bold.greenBright,
													em: chalk.bold.greenBright,
													success: chalk.bold.greenBright,
												},
												indicator (state, choice) {
													return ` ${choice.enabled ? `●` : `○`}`;
												},
												format() {
													if (!this.state.submitted || this.state.cancelled) return ``;
													return c.bold.greenBright(`done!`);
												},
											}).then(async (result) => {
												copies.push(result.chosenQuality);
											});
										} else {
											copies.push(qualities[0].url);
										};
									});
								};

								spinner.stop();
								spinner.start(`Copying values...`);

								f.copy(copies)
								.then(() => {
									spinner.stop();

									console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Copy streams:`)} · ${c.bold.greenBright(`done!`)}`);
								})
								.catch(() => {f.returnError(`couldnt copy values`)});
							break;
							case yargs.op:
								for (stream of result.chosenStreams) {
									await open(`https://twitch.tv/${stream.user_login}`);
								};

								console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Open streams:`)} · ${c.bold.greenBright(`done!`)}`);
							break;
						};
					})
					.catch(() => {process.exit(0)});
				};
			});
		}
	)
	.command(`auth`, `change account or reauth`, () => {},
		async () => {
			spinner.start();

			const 
				csrf = new require(`csrf`)().secretSync(),
				app = require(`express`)()
			;

			let auth;

			// require(`open`)(`https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=obv6hgz6i68ofah3zvwo442j1o58dj&scope=user:read:follows+user:read:subscriptions+channel:read:subscriptions&redirect_uri=http://localhost:8989/back&state=${csrf}`);
			// require(`express`)().get(`/`, (req, res) => res.sendFile(`${f.getDir()}\\front\\auth.html`)).use(require(`express`).static(`${f.getDir()}\\front\\`)).listen(8989);

			app.get(`/back`, (req, res) => {
				auth = req.query;
				res.redirect(`/`);
			});

			app.use(require(`express`).static(`${f.getDir()}\\front\\`));
			app.get(`/`, (req, res) => res.sendFile(`${f.getDir()}\\front\\index.html`));

			app.get(`/front`, (req, res) => {
				fetch(`https://id.twitch.tv/oauth2/token
					?client_id=${process.env.CLIENT}
					&client_secret=${process.env.SECRET}
					&code=${auth.code}
					&grant_type=authorization_code
					&redirect_uri=http://localhost:8989`, {method: `POST`})
				.then((response) => response.json())
				.then((data) => {
					res.status(200).json(data);
				})
				.catch((error) => reject(error));
			});

			app.listen(8989);

			spinner.stop();

			console.log(`WARNING: ${c.bold.redBright(`DO NOT SHOW ON STREAM`)}`);

			enquirer.prompt({
				type: `Toggle`,
				name: `warned`,
				enabled: `yes`,
				disabled: `no`,
				message: `Acknowledge?`,
				styles: {
					default: chalk.reset,
					strong: chalk.bold.cyanBright,
					primary: chalk.bold.greenBright,
					em: chalk.bold.greenBright,
					success: chalk.bold.greenBright,
				},
				footer: `\nUse ${c.bold.cyanBright(`←/→`)} keys and ${c.bold.cyanBright(`Enter[ ↵ ]`)}.`,
			}).then(async (result) => {
				if (!result.warned) {process.exit(0)};

				console.log(`${c.bold.magentaBright(`Auth`)}: opening browser...\u001B[?25h`);

				require(`open`)(`https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${process.env.CLIENT}&scope=user:read:follows+user:read:subscriptions+channel:read:subscriptions&redirect_uri=http://localhost:8989/back&state=${csrf}`);

				require(`readline`).createInterface({input: process.stdin, output: process.stdout}).question(`${c.bold.cyanBright(`Paste your token`)}: `, (both) => {
					const tokens = both.split(`;`);

					fetch(`https://api.twitch.tv/helix/users`, {method: `GET`,
						headers: {
							"client-id": process.env.CLIENT,
							"authorization": `Bearer ${tokens[0]}`,
						}
					})
					.then((response) => response.json())
					.then((auth) => {
						if (auth.hasOwnProperty(`error`)) {f.returnError(`invalid token`)};

						auth.data[0].token = tokens[0];
						auth.data[0].refresh = tokens[1];

						if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder);
						fs.writeFileSync(`${docFolder}\\auth.json`, JSON.stringify(auth.data[0], null, 4));

						console.log(c.bold.greenBright(`Success!`));
						process.exit(0);
					});
				});
			})
			.catch(() => {process.exit(0)});
		}
	)
	.example(`live`, `${c.bold.magentaBright(`[username]`)} --- [category] --- [uptime] --- ${c.bold.redBright(`[viewercount]`)}\n\t>>>[title]`)
	.command(`live [username]`, `returns data about [username] stream`, (yargs) => {
		yargs.positional(`username`, {
			type: `string`,
			default: auth.login,
			desc: `default returns your stream`,
			coerce: (username) => {return username.toLowerCase()},
		});
	},
		(yargs) => {
			f.GET(`streams?user_login=${yargs.username || yargs.default}`)
			.then((stream) => {
				if (stream.data.length === 0) {console.log(`offline`)}
				else {
					console.log(`${c.bold.magentaBright(stream.data[0].user_name)} --- ${stream.data[0].game_name} --- ${f.streamedTime(stream.data[0].started_at)} --- ${c.bold.redBright(stream.data[0].viewer_count)}\n\t>>>${stream.data[0].title}`);
				};
			});
		}
	)
	.example(`user`, `[id] --- ${c.bold.magentaBright(`[username]`)}${c.bold.magentaBright(`[partner]`)} --- [followercount] --- [create at] --- ${c.bold.redBright(`[viewcount]`)}`)
	.command(`user [username]`, `returns data about [username]`, (yargs) => {
		yargs.positional(`username`, {
			type: `string`,
			default: auth.login,
			desc: `default is your username`,
			coerce: (username) => {return username.toLowerCase()},
		});
	},
		(yargs) => {
			f.GET(`users?login=${yargs.username || yargs.default}`)
			.then((user) => {
				if (user.data.length === 0) f.returnError(`there is no such username`);

				f.GET(`channels/followers?broadcaster_id=${user.data[0].id}`)
				.then((followers) => {
					console.log(`${user.data[0].id} --- ${c.bold.magentaBright(user.data[0].display_name)}${(user.data[0].broadcaster_type === `partner`) ? c.bold.magentaBright(`\u2588\u2588`) : c.bold.magentaBright(`\u2591\u2591`)} --- ${c.bold(followers.total)} --- ${new Date(user.data[0].created_at).toLocaleString()} --- ${c.bold.redBright(user.data[0].view_count)}`);
				});
			});
		}
	)
	.command(`follows`, `returns your follows`, () => {},
		// DEPRECATION UPDATE
		(yargs) => {
			const result = [];

			f.GET(`channels/followed?user_id=${auth.id}&first=100`)
			.then((follows) => {
				result.push(...follows.data);
				let cursor = follows.pagination.cursor;

				(async () => {
					while (cursor) {
						await f.GET(`channels/followed?user_id=${auth.id}&first=100&after=${cursor}`)
						.then((res) => {
							result.push(...res.data);
							cursor = res.pagination.cursor;
						});
					};
					
					for (follow of result) {
						console.log(`#${follows.total--}\t${c.bold.magentaBright(follow.broadcaster_name)} --- ${new Date(follow.followed_at).toLocaleString()} --- ${moment(new Date(follow.followed_at).getTime()).local().fromNow()}`);
					};
				})();
			});
		}
	)
	// .example(`follows`, `[#]\t${c.bold.magentaBright(`[follow]`)} --- [followed at] --- [followage]`)
	// .command(`follows [username]`, `returns [username] follows`, (yargs) => {
	// 	yargs.positional(`username`, {
	// 		type: `string`,
	// 		default: auth.login,
	// 		desc: `default is your username`,
	// 		coerce: (username) => {return username.toLowerCase()},
	// 	});
	// },
	// 	(yargs) => {
	// 		const result = [];

	// 		f.GET(`users?login=${yargs.username}`)
	// 		.then((user) => {
	// 			if (user.data.length === 0) f.returnError(`there is no such username`);

	// 			f.GET(`users/follows?from_id=${user.data[0].id}&first=100`)
	// 			.then((follows) => {
	// 				result.push(...follows.data);
	// 				let cursor = follows.pagination.cursor;

	// 				(async () => {
	// 					while (cursor) {
	// 						await f.GET(`users/follows?from_id=${user.data[0].id}&first=100&after=${cursor}`)
	// 						.then((res) => {
	// 							result.push(...res.data);
	// 							cursor = res.pagination.cursor;
	// 						});
	// 					};
						
	// 					for (follow of result) {
	// 						console.log(`#${follows.total--}\t${c.bold.magentaBright(follow.to_name)} --- ${new Date(follow.followed_at).toLocaleString()} --- ${moment(new Date(follow.followed_at).getTime()).local().fromNow()}`);
	// 					};
	// 				})();
	// 			});
	// 		})
	// 	}
	// )
	// .example(`following`, `${c.bold.greenBright(`[boolean]`)} --- ${c.bold.magentaBright(`[from]`)} >>> ${c.bold.magentaBright(`[to]`)} --- [followed at] --- [followage]`)
	// .command(`following <from> <to>`, `returns boolean if <from> follows <to>`, (yargs) => {
	// 	yargs.positional(`from`, {
	// 		type: `string`,
	// 		required: true,
	// 		desc: `who is following`,
	// 		coerce: (from) => {return from.toLowerCase()},
	// 	});
	// 	yargs.positional(`to`, {
	// 		type: `string`,
	// 		required: true,
	// 		desc: `whom is followed`,
	// 		coerce: (to) => {return to.toLowerCase()},
	// 	});
	// },
	// 	(yargs) => {
	// 		f.GET(`users?login=${yargs.from}&login=${yargs.to}`)
	// 		.then((users) => {
	// 			if (users.data.length === 0) f.returnError(`"${yargs.from}" and "${yargs.to}" are not found`);
	// 			if (users.data.length !== 2) (users.data[0].login === yargs.from) ? f.returnError(`"${yargs.to}" is not found`) : f.returnError(`"${yargs.from}" is not found`);

	// 			f.GET(`users/follows?from_id=${users.data[0].id}&to_id=${users.data[1].id}`)
	// 			.then((following) => {
	// 				(!!(following.data[0])) ? console.log(`${c.bold.greenBright(`true`)} --- ${c.bold.magentaBright(following.data[0].from_login)} >>> ${c.bold.magentaBright(following.data[0].to_login)} --- ${new Date(following.data[0].followed_at).toLocaleString()} --- ${moment(new Date(following.data[0].followed_at).getTime()).local().fromNow()}`) : console.log(`${c.bold.redBright(`false`)}`);
	// 			});
	// 		})
	// 	}
	// )
	.example(`team`, `${c.bold.magentaBright(`[name]`)} --- [created at] ::: [createage] >>> [updated at] ::: [updateage]`)
	.command(`team <team>`, `returns data about <team>`, (yargs) => {
		yargs.positional(`team`, {
			type: `string`,
			required: true,
			desc: ``,
			coerce: (team) => {return team.toLowerCase()},
		});
	},
		(yargs) => {
			f.GET(`teams?name=${yargs.team}`)
			.then((team) => {
				if (team.status === 404) f.returnError(`team "${yargs.team}" is not found`);

				console.log(`${c.bold.magentaBright(team.data[0].team_display_name)} --- ${new Date(team.data[0].created_at).toLocaleString()} ::: ${moment(new Date(team.data[0].created_at).getTime()).local().fromNow()} >>> ${new Date(team.data[0].updated_at).toLocaleString()} ::: ${moment(new Date(team.data[0].updated_at).getTime()).local().fromNow()}`);

				let total = 1;

				for (member of team.data[0].users) {
					console.log(`\t#${total++}\t${c.bold.magentaBright(member.user_name)}`);
				};
			})
		}
	)
	.example(`member`, `[#]\t${c.bold.magentaBright(`[team]`)} --- [created at] ::: [createage] >>> [updated at] ::: [updateage]`)
	.command(`member <username>`, `returns teams which <username> is part of`, (yargs) => {
		yargs.positional(`username`, {
			type: `string`,
			required: true,
			desc: ``,
			coerce: (username) => {return username.toLowerCase()},
		});
	},
		(yargs) => {
			f.GET(`users?login=${yargs.username}`)
			.then((user) => {
				if (user.data.length === 0) f.returnError(`there is no such username`);

				f.GET(`teams/channel?broadcaster_id=${user.data[0].id}`)
				.then((teams) => {
					let total = 1;

					for (team of teams.data) {
						console.log(`#${total++}\t${c.bold.magentaBright(team.team_display_name)} --- ${new Date(team.created_at).toLocaleString()} ::: ${moment(new Date(team.created_at).getTime()).local().fromNow()} >>> ${new Date(team.updated_at).toLocaleString()} ::: ${moment(new Date(team.updated_at).getTime()).local().fromNow()}`);
					};
				})
			})
		}
	)
	.alias(`directory`, `dir`)/*<-- doesnt work for some reason?*/.example(`directory`, `${c.bold.magentaBright(`[username]`)} --- [uptime] --- ${c.bold.redBright(`[viewercount]`)}\n\t>>>[title]`)
	.command(`directory <dirname>`, `returns streams from <dirname> directory`, (yargs) => {
		yargs.positional(`dirname`, {
			type: `string`,
			required: true,
			desc: ``,
		});
		yargs.option(`full`, {
			boolean: true,
			desc: `show full titles`,
			required: false,
			alias: `f`,
		});
	},
		(yargs) => {
			f.GET(`games?name=${yargs.dirname}`)
			.then((dirname) => {
				if (dirname.data.length === 0) f.returnError(`there is no such directory`);

				f.GET(`streams?game_id=${dirname.data[0].id}&first=100`)
				.then((streams) => {
					console.log(`${dirname.data[0].id} --- ${c.bold.magentaBright(dirname.data[0].name)}`);

					for (stream of streams.data) {
						console.log(`${c.bold.magentaBright(stream.user_name)} --- ${f.streamedTime(stream.started_at)} --- ${c.bold.redBright(stream.viewer_count)}\n\t>>>${f.title(stream.title, yargs.full)}`);
					};
				})
			})
		}
	)
	.example(`top`, `[#]\t${c.bold.magentaBright(`[username]`)} --- [category] --- [uptime] --- ${c.bold.redBright(`[viewercount]`)}\n\t>>>[title]`)
	.command(`top`, `returns top streams`, (yargs) => {
		yargs.option(`full`, {
			boolean: true,
			desc: `show full titles`,
			required: false,
			alias: `f`,
		});
	},
		(yargs) => {
			f.GET(`streams?first=100`)
			.then((streams) => {
				let total = 1;

				for (stream of streams.data) {
					console.log(`#${total++}\t${c.bold.magentaBright(stream.user_name)} --- ${stream.game_name} --- ${f.streamedTime(stream.started_at)} --- ${c.bold.redBright(stream.viewer_count)}\n\t>>>${f.title(stream.title, yargs.full)}`);
				};
			})
		}
	)
	.command(`clip <links|ids..>`, `returns data about specified clips`, (yargs) => {
		yargs.options({
			"id" : {
				boolean: true,
				desc: `input of ids`,
				required: false,
			},
			"cp": {
				boolean: true,
				desc: `copy clips`,
				required: false,
				alias: [`c`, `copy`],
			},
			"op": {
				boolean: true,
				desc: `open clips`,
				required: false,
				alias: [`o`, `open`],
			},
			"dl": {
				boolean: true,
				desc: `download clips`,
				required: false,
				alias: [`d`, `download`],
			},
		});
	},
		async (yargs) => {
			spinner.start();

			if (yargs.links.length > 100 || yargs.ids.length > 100) {
				spinner.stop();

				f.returnError(`maximum is 100`)
			};

			if (!yargs.id && f.checkURLs(yargs.links)) {
				yargs.links.forEach((link, index) => {
					yargs.ids[index] = f.getClipID(link);
				});
			};

			const clips = [];

			let count = 0;

			for await (id of yargs.ids) {
				await f.GET(`clips?id=${id}`)
				.then((clip) => {
					if (clip.data.length === 0) {
						spinner.stop();

						f.returnError(`#${count} is invalid`);
					};

					clips.push(clip.data[0]);
					count++;
				});
			};

			spinner.stop();

			switch (true) {
				case yargs.cp:
					spinner.start(`Copying values...`);

					const copies = [];

					for (clip of clips) {
						copies.push(f.getClip(clip.thumbnail_url));
					};

					f.copy(copies)
					.then(() => {
						spinner.stop();

						console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Copy clips:`)} · ${c.bold.greenBright(`done!`)}`);
					})
					.catch(() => {f.returnError(`couldnt copy values`)});
				break;
				case yargs.op:
					for (clip of clips) {
						await open(clip.url);
					};

					console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Open clips:`)} · ${c.bold.greenBright(`done!`)}`);
				break;
				case yargs.dl: 						
					const 
						promises = [],
						bars = [],
						multibar = new cliProgress.MultiBar({
							clearOnComplete: true,
							hideCursor: true,
							format: `{title} | ${c.magentaBright(`{bar}`)} | {percentage}% | ETA: {eta}s`,
							barCompleteChar: `\u2588`,
							barIncompleteChar: `\u2591`,
						})
					;

					clips.forEach((element, index) => {
						bars.push(multibar.create(100, 0, {title: f.title(element.title, yargs.full, 16).padEnd(20)}));

						promises.push(new Promise(async (resolve, reject) => {
							const d = new downloader({
								url: f.getClip(element.thumbnail_url),
								directory: `${docFolder}\\clips`,
								cloneFiles: false,
								skipExistingFileName: true,
								onProgress: function (percentage) {
									bars[index].update(+percentage);
									bars[index].updateETA();
								},
							});

							try {
								await d.download();

								resolve();
							} catch (error) {
								reject(error);
							};
						}));
					});


					Promise.all(promises)
					.then(() => {
						multibar.stop();

						console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Download clips:`)} · ${c.bold.greenBright(`done!`)}`);
					})
					.catch(console.error);
				break;
				default:
					let count = 1;

					for (clip of clips) {
						await f.GET(`games?id=${clip.game_id}`)
						.then((game) => {
							console.log(`#${count++}\t<<<${clip.id}\n\t${c.bold.magentaBright(clip.creator_name)} --- ${game.data[0].name} --- ${new Date(clip.created_at).toLocaleString()} --- ${moment(new Date(clip.created_at).getTime()).local().fromNow()} --- ${clip.duration}s --- ${c.bold.redBright(clip.view_count)}\n\t\t>>>${f.title(clip.title, yargs.full)}`);
						});
					};
				break;
			};
		}
	)
	.example(`clip/clips`, `[#]\t<<<[id]\n\t${c.bold.magentaBright(`[username]`)} --- [category] --- [created at] --- [createage] --- [duration] --- ${c.bold.redBright(`[viewcount]`)}\n\t\t>>>[title]`)
	.command(`clips [username] [amount]`, `returns clips`, (yargs) => {
		yargs.positional(`username`, {
			type: `string`,
			default: auth.login,
			required: false,
			desc: ``,
			coerce: (username) => {return username.toLowerCase()},
		});
		yargs.positional(`amount`, {
			type: `number`,
			default: 10,
			required: false,
			desc: ``,
			coerce: (amount) => {
				if (isNaN(amount)) f.returnError(`${c.underline(amount)} is Not a Number`);
				if (amount > 100) f.returnError(`maximum is 100`);
				if (amount < 1) f.returnError(`minimum is 1`);

				return amount;
			},
		});
		yargs.options({
			"cp": {
				boolean: true,
				desc: `copy selected clips`,
				required: false,
				alias: [`c`, `copy`],
			},
			"op": {
				boolean: true,
				desc: `open selected clips`,
				required: false,
				alias: [`o`, `open`],
			},
			"dl": {
				boolean: true,
				desc: `download selected clips`,
				required: false,
				alias: [`d`, `download`],
			},
			"timeperiod": {
				desc: `sort by timeperiod`,
				required: false,
				default: `w`,
				alias: `t`,
				choices: [`d`, `w`, `m`, `y`, `a`],
			},	
			"full": {
				boolean: true,
				desc: `show full titles`,
				required: false,
				alias: `f`,
			},
		});
	},
		(yargs) => {
			spinner.start();

			f.GET(`users?login=${yargs.username}`)
			.then((user) => {
				if (user.data.length === 0) {
					spinner.stop();

					f.returnError(`there is no such username`);
				};

				f.GET(`clips?broadcaster_id=${user.data[0].id}&started_at=${(yargs.timeperiod == `a`) ? new Date(user.data[0].created_at).toISOString() : f.getDate(yargs.timeperiod)}&ended_at=${new Date().toISOString()}&first=${yargs.amount}`)
				.then(async (clips) => {
					let count = 1;
					const choices = [];

					// OLD IMPLEMENTAION OF CATEGORIES IN CLIPS
					// get clips data
					// go through all clips and gather their game ids and put it in array
					// fetch their names through /games?id=...&id=... and return another array
					// then for each clip find its game id in array and return game name
					
					spinner.stop();

					if (clips.data.length === 0) {
						console.log(c.bold.yellow.italic(`no clips found`));
						process.exit(0);
					};

					for (clip of clips.data) {
						await f.GET(`games?id=${clip.game_id}`)
						.then(async (game) => {
							const output = `#${count++}\t<<<${clip.id}\n\t${c.bold.magentaBright.bgBlack(clip.creator_name)} --- ${game.data[0].name} --- ${new Date(clip.created_at).toLocaleString()} --- ${moment(new Date(clip.created_at).getTime()).local().fromNow()} --- ${clip.duration}s --- ${c.bold.redBright(clip.view_count)}\n\t\t>>>${f.title(clip.title, yargs.full)}`;

							(yargs.cp || yargs.op || yargs.dl) ? choices.push({name: output, value: clip}) : console.log(output);
						});
					};

					if (yargs.cp || yargs.op || yargs.dl) {
						enquirer.prompt({
							type: `multiselect`,
							name: `chosenClips`,
							message: `Choose clips:`,
							limit: yargs.amount,
							choices: choices,
							pointer: `>`,
							emptyError: `${c.bold.redBright(`none were selected.`)}`,
							footer: `\nUse ${c.bold.cyanBright(`↑/↓`)} keys with ${c.bold.cyanBright(`Space[ ⎵ ]`)} and ${c.bold.cyanBright(`Enter[ ↵ ]`)}.`,
							styles: {
								default: chalk.reset,
								strong: chalk.bold.cyanBright,
								primary: chalk.bold.greenBright,
								em: chalk.bold.greenBright,
								success: chalk.bold.greenBright,
							},
							indicator (state, choice) {
								return ` ${choice.enabled ? `●` : `○`}`;
							},
							result (result) {
								return Object.values(this.map(result));
							},
							format() {
								// code straight from the module itself
								// ugly i know, but dont wanna mess with it
								if (!this.state.submitted || this.state.cancelled) return ``;
								if (Array.isArray(this.selected) && this.selected.length > 0) {
									return c.bold.greenBright(`done!`);
								}
								return;
							},
						}).then(async (result) => {
							switch (true) {
								case yargs.cp:
									spinner.start(`Copying values...`);

									const copies = [];

									for (clip of result.chosenClips) {
										copies.push(f.getClip(clip.thumbnail_url));
									};

									f.copy(copies)
									.then(() => {
										spinner.stop();

										console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Copy clips:`)} · ${c.bold.greenBright(`done!`)}`);
									})
									.catch(() => {f.returnError(`couldnt copy values`)});
								break;
								case yargs.op:
									for (clip of result.chosenClips) {
										await open(clip.url);
									};

									console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Open clips:`)} · ${c.bold.greenBright(`done!`)}`);
								break;
								case yargs.dl: 						
									const 
										promises = [],
										bars = [],
										multibar = new cliProgress.MultiBar({
											clearOnComplete: true,
											hideCursor: true,
											format: `{title} | ${c.magentaBright(`{bar}`)} | {percentage}% | ETA: {eta}s`,
											barCompleteChar: `\u2588`,
											barIncompleteChar: `\u2591`,
										})
									;

									result.chosenClips.forEach((element, index) => {
										bars.push(multibar.create(100, 0, {title: f.title(element.title, yargs.full, 16).padEnd(20)}));

										promises.push(new Promise(async (resolve, reject) => {
											const d = new downloader({
												url: f.getClip(element.thumbnail_url),
												directory: `${docFolder}\\clips`,
												cloneFiles: false,
												skipExistingFileName: true,
												onProgress: function (percentage) {
													bars[index].update(+percentage);
													bars[index].updateETA();
												},
											});

											try {
												await d.download();

												resolve();
											} catch (error) {
												reject(error);
											};
										}));
									});


									Promise.all(promises)
									.then(() => {
										multibar.stop();

										console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Download clips:`)} · ${c.bold.greenBright(`done!`)}`);
									})
									.catch(console.error);
								break;
							};
						})
						.catch(() => {process.exit(0)});
					};
				});
			});
		}
	)
	.command(`vod <links|ids..>`, `returns data about specified vods`, (yargs) => {
		yargs.options({
			"id" : {
				boolean: true,
				desc: `input of ids`,
				required: false,
			},
			"cp": {
				boolean: true,
				desc: `copy vods`,
				required: false,
				alias: [`c`, `copy`],
			},
			"op": {
				boolean: true,
				desc: `open vods`,
				required: false,
				alias: [`o`, `open`],
			},
			"dl": {
				boolean: true,
				desc: `download vods`,
				required: false,
				alias: [`d`, `download`],
			},
			"quality": {
				desc: `selected quality`,
				required: false,
				default: `source`,
				alias: `q`,
				choices: [`source`, `1080p60`, `720p60`, `720p`, `480p`, `360p`, `160p`],
			},	
			"full": {
				boolean: true,
				desc: `show full titles`,
				required: false,
				alias: `f`,
			},
		});
	},
		async (yargs) => {
			spinner.start();

			if (yargs.links.length > 100 || yargs.ids.length > 100) {
				spinner.stop();

				f.returnError(`maximum is 100`)
			};

			if (!yargs.id && f.checkURLs(yargs.links)) {
				yargs.links.forEach((link, index) => {
					yargs.ids[index] = f.getVodID(link);
				});
			};

			const vods = [];

			let count = 0;

			for await (id of yargs.ids) {
				await f.GET(`videos?id=${id}`)
				.then((vod) => {
					if (vod.data.length === 0) {
						spinner.stop();

						f.returnError(`#${count} is invalid`);
					};

					vods.push(vod.data[0]);
					count++;
				});
			};

			spinner.stop();

			switch (true) {
				case yargs.cp:
					spinner.start(`Copying values...`);

					const copies = [];

					for (vod of vods) {
						copies.push(f.getVod(vod.thumbnail_url, yargs.quality));
					};

					f.copy(copies)
					.then(() => {
						spinner.stop();

						console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Copy vods:`)} · ${c.bold.greenBright(`done!`)}`);
					})
					.catch(() => {f.returnError(`couldnt copy values`)});
				break;
				case yargs.op:
					for (vod of vods) {
						await open(vod.url);
					};

					console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Open vods:`)} · ${c.bold.greenBright(`done!`)}`);
				break;
				case yargs.dl: 						
					const 
						promises = [],
						bars = [],
						multibar = new cliProgress.MultiBar({
							clearOnComplete: true,
							hideCursor: true,
							format: `{title} | ${c.magentaBright(`{bar}`)} | {percentage}% | ETA: {eta_formatted}`,
							barCompleteChar: `\u2588`,
							barIncompleteChar: `\u2591`,
							etaBuffer: 64,
						})
					;
					
					if (!commandExistsSync(`ffmpeg`)) {
						console.clear();
						f.returnError(`ffmpeg was not found`);
					};

					vods.forEach((element, index) => {
						bars.push(multibar.create(100, 0, {title: f.title(element.title, yargs.full, 29).padEnd(32)}));

						if (!fs.existsSync(`${docFolder}\\vods`)) fs.mkdirSync(`${docFolder}\\vods`);

						promises.push(new Promise(async (resolve, reject) => {
							await new m3u8ToMp4().setInputFile(f.getVod(element.thumbnail_url, yargs.quality)).setOutputFile(`${docFolder}\\vods\\${element.id}.mp4`).start(null, (percentage) => {
								bars[index].update((percentage > 0) ? +percentage : 0);
								bars[index].updateETA();
							})
							.then(() => resolve());
						}));
					});

					Promise.all(promises)
					.then(() => {
						multibar.stop();

						console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Download vods:`)} · ${c.bold.greenBright(`done!`)}`);
					})
					.catch(console.error);
				break;
				default:
					let count = 1;

					for (vod of vods) {
						console.log(`#${count++}\t${c.bold.magentaBright.bgBlack(vod.id)} --- ${new Date(vod.created_at).toLocaleString()} --- ${moment(new Date(vod.created_at).getTime()).local().fromNow()} --- ${vod.duration} --- ${c.bold.redBright(vod.view_count)}\n\t\t>>>${f.title(vod.title, yargs.full)}`);
					};
				break;
			};
		}
	)
	.example(`vod/vods`, `[#]\t${c.bold.magentaBright(`[id]`)} --- [started at] --- [startedage] --- [duration] --- ${c.bold.redBright(`[viewcount]`)}\n\t\t>>>[title]`)
	.command(`vods [username] [amount]`, `returns vods`, (yargs) => {
		yargs.positional(`username`, {
			type: `string`,
			default: auth.login,
			required: false,
			desc: ``,
			coerce: (username) => {return username.toLowerCase()},
		});
		yargs.positional(`amount`, {
			type: `number`,
			default: 10,
			required: false,
			desc: ``,
			coerce: (amount) => {
				if (isNaN(amount)) f.returnError(`${c.underline(amount)} is Not a Number`);
				if (amount > 100) f.returnError(`maximum is 100`);
				if (amount < 1) f.returnError(`minimum is 1`);

				return amount;
			},
		});
		yargs.options({
			"cp": {
				boolean: true,
				desc: `copy selected vods`,
				required: false,
				alias: [`c`, `copy`],
			},
			"op": {
				boolean: true,
				desc: `open selected vods`,
				required: false,
				alias: [`o`, `open`],
			},
			"dl": {
				boolean: true,
				desc: `download selected vods`,
				required: false,
				alias: [`d`, `download`],
			},
			"quality": {
				desc: `selected quality`,
				required: false,
				default: `source`,
				alias: `q`,
				choices: [`source`, `1080p60`, `720p60`, `720p`, `480p`, `360p`, `160p`],
			},	
			"full": {
				boolean: true,
				desc: `show full titles`,
				required: false,
				alias: `f`,
			},
		});
	},
		(yargs) => {
			spinner.start();

			f.GET(`users?login=${yargs.username}`)
			.then((user) => {
				if (user.data.length === 0) {
					spinner.stop();

					f.returnError(`there is no such username`);
				};

				f.GET(`videos?user_id=${user.data[0].id}&sort=time&period=all&first=${yargs.amount}`)
				.then(async (vods) => {
					let count = 1;
					const choices = [];
					
					spinner.stop();

					if (vods.data.length === 0) {
						console.log(c.bold.yellow.italic(`no vods found`));
						process.exit(0);
					};

					for (vod of vods.data) {
						const output = `#${count++}\t${c.bold.magentaBright.bgBlack(vod.id)} --- ${new Date(vod.created_at).toLocaleString()} --- ${moment(new Date(vod.created_at).getTime()).local().fromNow()} --- ${vod.duration} --- ${c.bold.redBright(vod.view_count)}\n\t\t>>>${f.title(vod.title, yargs.full)}`;

						(yargs.cp || yargs.op || yargs.dl) ? choices.push({name: output, value: vod}) : console.log(output);
					};

					if (yargs.cp || yargs.op || yargs.dl) {
						enquirer.prompt({
							type: `multiselect`,
							name: `chosenVods`,
							message: `Choose vods:`,
							limit: yargs.amount,
							choices: choices,
							pointer: `>`,
							emptyError: `${c.bold.redBright(`none were selected.`)}`,
							footer: `\nUse ${c.bold.cyanBright(`↑/↓`)} keys with ${c.bold.cyanBright(`Space[ ⎵ ]`)} and ${c.bold.cyanBright(`Enter[ ↵ ]`)}.`,
							styles: {
								default: chalk.reset,
								strong: chalk.bold.cyanBright,
								primary: chalk.bold.greenBright,
								em: chalk.bold.greenBright,
								success: chalk.bold.greenBright,
							},
							indicator (state, choice) {
								return ` ${choice.enabled ? `●` : `○`}`;
							},
							result (result) {
								return Object.values(this.map(result));
							},
							format() {
								if (!this.state.submitted || this.state.cancelled) return ``;
								if (Array.isArray(this.selected) && this.selected.length > 0) {
									return c.bold.greenBright(`done!`);
								}
								return;
							},
						}).then(async (result) => {
							switch (true) {
								case yargs.cp:
									spinner.start(`Copying values...`);

									const copies = [];

									for (vod of result.chosenVods) {
										copies.push(f.getVod(vod.thumbnail_url, yargs.quality));
									};

									f.copy(copies)
									.then(() => {
										spinner.stop();

										console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Copy vods:`)} · ${c.bold.greenBright(`done!`)}`);
									})
									.catch(() => {f.returnError(`couldnt copy values`)});
								break;
								case yargs.op:
									for (vod of result.chosenVods) {
										await open(vod.url);
									};

									console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Open vods:`)} · ${c.bold.greenBright(`done!`)}`);
								break;
								case yargs.dl:
									const 
										promises = [],
										bars = [],
										multibar = new cliProgress.MultiBar({
											clearOnComplete: true,
											hideCursor: true,
											format: `{title} | ${c.magentaBright(`{bar}`)} | {percentage}% | ETA: {eta_formatted}`,
											barCompleteChar: `\u2588`,
											barIncompleteChar: `\u2591`,
											etaBuffer: 64,
										})
									;
									
									if (!commandExistsSync(`ffmpeg`)) {
										console.clear();
										f.returnError(`ffmpeg was not found`);
									};

									result.chosenVods.forEach((element, index) => {
										bars.push(multibar.create(100, 0, {title: f.title(element.title, yargs.full, 29).padEnd(32)}));

										if (!fs.existsSync(`${docFolder}\\vods`)) fs.mkdirSync(`${docFolder}\\vods`);

										promises.push(new Promise(async (resolve, reject) => {
											await new m3u8ToMp4().setInputFile(f.getVod(element.thumbnail_url, yargs.quality)).setOutputFile(`${docFolder}\\vods\\${element.id}.mp4`).start(null, (percentage) => {
												bars[index].update((percentage > 0) ? +percentage : 0);
												bars[index].updateETA();
											})
											.then(() => resolve());
										}));
									});

									Promise.all(promises)
									.then(() => {
										multibar.stop();

										console.log(`${c.bold.greenBright(`\u2714`)} ${c.bold.cyanBright(`Download vods:`)} · ${c.bold.greenBright(`done!`)}`);
									})
									.catch(console.error);
								break;
							};

						})
						.catch(() => {process.exit(0)});
					};
				});
			});
		}
	)
	.command(`about`, ``, () => {}, (yargs) => {console.log(`${c.bold.yellowBright(`tickly`)} ${c.bold.greenBright(version)} @ ${c.bold.redBright(build)}\ntwitch command-line interface\n\n${c.cyanBright.underline(`https://github.com/eAlexandrohin/tickly\nhttps://www.npmjs.com/package/tickly`)}\n\n${c.bold.magentaBright(`@ealexandrohin`)}\n\n${c.italic(`MIT License`)}`)})
	.version(version).alias(`--version`, `-v`).help().alias(`--help`, `-h`).argv;
} catch (error) {
	require(`fs`).writeFileSync(`${docFolder}\\tickly.log`, JSON.stringify(error, Object.getOwnPropertyNames(error), 4));

	console.log(`${c.bold.redBright(`Error`)}: something went terribly wrong.\nPlease, report this issue by sending in ${c.bold.bgYellow(`tickly.log`)} file in ${c.bold.bgCyan(docFolder)} at:\n${c.underline.yellowBright(`https://github.com/eAlexandrohin/tickly/issues`)}`);
};