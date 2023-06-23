const
	yargs = require(`yargs`),
	c = require(`ansi-colors`),
	moment = require(`moment`),
	fs = require(`fs`),
	docFolder = `C:\\Users\\${require(`os`).userInfo().username}\\Documents\\tickly`
;

// todo:
// make use of users chat color
const version = `v3.0`;

const f = {
	GET: (path) => new Promise((resolve, reject) => {
		fetch(`https://api.twitch.tv/helix/${path}`, {method: `GET`,
			headers: {
				'client-id': `obv6hgz6i68ofah3zvwo442j1o58dj`,
				'authorization': `Bearer ${auth.token}`,
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
		.then((data) => (data[0].tag_name === version) ? resolve(true) : console.log(`Update avaliable: ${c.bold.redBright(data[0].tag_name)}\nYou can update by running: ${c.bgMagenta.italic(`tickly update`)}\nSee: ${c.yellowBright.underline(`https://github.com/ealexandrohin/tickly/releases/latest`)}`));
	}),
	checkAuth: () => new Promise((resolve, reject) => {
		fetch(`https://api.twitch.tv/helix/users`, {method: `GET`,
			headers: {
				'client-id': `obv6hgz6i68ofah3zvwo442j1o58dj`,
				'authorization': `Bearer ${auth.token}`,
			}
		})
		.then((response) => response.json())
		.then((data) => (data.error === `Unauthorized`) ? console.log(`${c.bold.redBright(`Error`)}: your token is invalid.\nUse \"${c.bgMagenta.italic(`tickly auth`)}\" for reauth.`) : resolve(true));
	}),
	title: (t, full) => {
		return ((!full && t.length < 64) || (full && t.length >= 64)) ? t.replace(/\r?\n|\r/g, `\s`).trim() : t.replace(/\r?\n|\r/g, `\s`).trim().substring(0, 64)+`...`;
	},
	streamedTime: (start) => {
		return new Date(new Date() - new Date(start)).toLocaleTimeString();
	},
	getDir: () => {
		return (process.pkg) ? require(`path`).resolve(process.execPath + `/..`) : require(`path`).join(require.main ? require.main.path : process.cwd());
	},
	returnError: (message) => {
		console.log(`${c.bold.redBright(`Error`)}: ${message}.`);
		process.exit(1);
	},
};

// auth
let auth;
if (!fs.existsSync(`${docFolder}\\auth.json`) && process.argv[2].toLowerCase() != `auth`) {f.returnError(`no auth`)};
if (fs.existsSync(`${docFolder}\\auth.json`)) {auth = require(`${docFolder}\\auth.json`)};

// MAIN ENTRY POINT
yargs

.check(async (argv) => {
	if (argv._[0] === `auth`) {return true} 
	else {
		if (await f.checkInternet() /*&& await f.checkUpdates()*/ && await f.checkAuth()) {return true} 
		else {return false};
	};

	if (argv.themeYellow) globalThis.crdr = true;
}, true)
.command(`$0`, `returns your followed streams`, (yargs) => {
	yargs.option(`full`, {
		desc: `set full titles`,
		required: false,
		alias: `f`,
	});
},
	(yargs) => {
		f.GET(`streams/followed?user_id=${auth.id}`)
		.then((streams) => {
			if (streams.data.length === 0) {console.log(`${c.bold.cyanBright(`No one is live...`)}\n${c.bold.grey(`Sadge`)}`)}
			else {
				for (stream of streams.data) {
					console.log(`${c.bold.magentaBright(stream.user_name)} --- ${stream.game_name} --- ${f.streamedTime(stream.started_at)} --- ${c.bold.redBright(stream.viewer_count)}\n\t>>>${f.title(stream.title, yargs.full)}`);
				};
			};
		});
	}
)
.command(`auth`, `change account or reauth`, () => {},
	() => {
		require(`express`)().get(`/`, (req, res) => res.sendFile(`${f.getDir()}\\front\\auth.html`)).use(require(`express`).static(`${f.getDir()}\\front\\`)).listen(8989);

		console.log(`${c.bold.magentaBright(`Auth`)}: opening browser...`);

		require(`open`)(`https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=obv6hgz6i68ofah3zvwo442j1o58dj&redirect_uri=http://localhost:8989&scope=user:read:follows+user:edit:follows`);

		require(`readline`).createInterface({input: process.stdin, output: process.stdout}).question(`Paste your token: `, (token) => {
			fetch(`https://api.twitch.tv/helix/users`, {method: `GET`,
				headers: {
					'client-id': `obv6hgz6i68ofah3zvwo442j1o58dj`,
					'authorization': `Bearer ${token}`,
				}
			})
			.then((response) => response.json())
			.then((auth) => {
				auth.data[0].token = token;

				if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder);
				fs.writeFileSync(`${docFolder}\\auth.json`, JSON.stringify(auth.data[0], null, `\t`));

				console.log(c.bold.greenBright(`Success!`));
				process.exit(0);
			});
		});
	}
)
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
.command(`follows [username]`, `returns [username] follows`, (yargs) => {
	yargs.positional(`username`, {
		type: `string`,
		default: auth.login,
		desc: `default is your username`,
		coerce: (username) => {return username.toLowerCase()},
	});
},
	(yargs) => {
		const result = [];

		f.GET(`users?login=${yargs.username}`)
		.then((user) => {
			if (user.data.length === 0) f.returnError(`there is no such username`);

			f.GET(`users/follows?from_id=${user.data[0].id}&first=100`)
			.then((follows) => {
				result.push(...follows.data);
				let cursor = follows.pagination.cursor;

				(async () => {
					while (cursor) {
						await f.GET(`users/follows?from_id=${user.data[0].id}&first=100&after=${cursor}`)
						.then((res) => {
							result.push(...res.data);
							cursor = res.pagination.cursor;
						});	
					};
					
					for (follow of result) {
						console.log(`#${follows.total--}\t${c.bold.magentaBright(follow.to_name)} --- ${new Date(follow.followed_at).toLocaleString()} --- ${moment(new Date(follow.followed_at).getTime()).local().fromNow()}`);
					};
				})();
			});
		})
	}
)
// DEPRECATION UPDATE

// .command(`follows`, `returns your follows`, () => {},
// 	(yargs) => {
// 		const result = [];

// 		f.GET(`channels/followed?user_id=${auth.id}&first=100`)
// 		.then((follows) => {
// 			result.push(...follows.data);
// 			let cursor = follows.pagination.cursor;

// 			(async () => {
// 				while (cursor) {
// 					await f.GET(`channels/followed?user_id=${auth.id}&first=100&after=${cursor}`)
// 					.then((res) => {
// 						result.push(...res.data);
// 						cursor = res.pagination.cursor;
// 					});	
// 				};
				
// 				for (follow of result) {
// 					console.log(`#${follows.total--}\t${c.bold.magentaBright(follow.broadcaster_name)} --- ${new Date(follow.followed_at).toLocaleString()} --- ${moment(new Date(follow.followed_at).getTime()).local().fromNow()}`);
// 				};
// 			})();
// 		});
// 	}
// )
.command(`following <from> <to>`, `returns boolean if <from> follows <to>`, (yargs) => {
	yargs.positional(`from`, {
		type: `string`,
		required: true,
		desc: `who is following`,
		coerce: (from) => {return from.toLowerCase()},
	});
	yargs.positional(`to`, {
		type: `string`,
		required: true,
		desc: `whom is followed`,
		coerce: (to) => {return to.toLowerCase()},
	});
},
	(yargs) => {
		f.GET(`users?login=${yargs.from}&login=${yargs.to}`)
		.then((users) => {
			if (users.data.length === 0) f.returnError(`"${yargs.from}" and "${yargs.to}" are not found`);
			if (users.data.length !== 2) (users.data[0].login === yargs.from) ? f.returnError(`"${yargs.to}" is not found`) : f.returnError(`"${yargs.from}" is not found`);

			f.GET(`users/follows?from_id=${users.data[0].id}&to_id=${users.data[1].id}`)
			.then((following) => {
				(!!(following.data[0])) ? console.log(`${c.bold.greenBright(`true`)} --- ${c.bold.magentaBright(following.data[0].from_login)} >>> ${c.bold.magentaBright(following.data[0].to_login)} --- ${new Date(following.data[0].followed_at).toLocaleString()} --- ${moment(new Date(following.data[0].followed_at).getTime()).local().fromNow()}`) : console.log(`${c.bold.redBright(`false`)}`);
			});
		})
	}
)
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
.command(`directory <dirname>`, `returns streams from <dirname> directory`, (yargs) => {
	yargs.positional(`dirname`, {
		type: `string`,
		required: true,
		desc: ``,
	});
	yargs.option(`full`, {
		desc: `set full titles`,
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
.command(`top`, `returns top streams`, (yargs) => {
	yargs.option(`full`, {
		desc: `set full titles`,
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
.command(`update`, `update to the latest version`, (force) => {
	return yargs.option(`force`, {
		desc: `force download new version`,
		required: false,
		alias: `f`,
	})
},
	async (yargs) => {
		console.log(`${c.bold.greenBright(`Updating`)}: downloading newer version...`);

		console.log(yargs);

		if (!fs.existsSync(`${docFolder}\\update\\tickly-windows-x64.exe`) || yargs.force) {
			const progressBar = new require(`cli-progress`).SingleBar({
				format: `Downloading |${c.blueBright(`{bar}`)}| {percentage}% | ETA: {eta}s`,
				barCompleteChar: '\u2588', barIncompleteChar: '\u2591',
			});

			progressBar.start(100, 0);

			await new require(`nodejs-file-downloader`)({
				url: "https://github.com/ealexandrohin/tickly/releases/latest/download/tickly-windows-x64.exe",
				directory: `${docFolder}\\update\\`,
				cloneFiles: false,
				onProgress: (percentage) => progressBar.update(+percentage),
			}).download();

			progressBar.stop();
		};

		console.log(`${c.bold.greenBright(`Updating`)}: installing...\n\t${c.bold.magentaBright(`You need to close this cmd after you see installation window.`)}`);

		require(`child_process`).execFile(`${docFolder}\\update\\tickly-windows-x64.exe`, null, null, (error) => {if (error) f.returnError(`cannot open installation file`)});
	}
)
.version(version).alias(`--version`, `-v`).help().alias(`--help`, `-h`).argv;