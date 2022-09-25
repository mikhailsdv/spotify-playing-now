const logger = require("node-color-log")
const fs = require("fs")
const path = require("path")
const configDir = path.resolve(__dirname, "./config.json")

const response = (status, data) => {
	return {
		status,
		[status ? "data" : "error"]: data,
	}
}

const zeroFirst = number => {
	let offset = 2
	const numberLength = String(number).length
	if (numberLength > offset) {
		offset = numberLength
	}
	return `0${number}`.substr(-offset)
}

const getDateString = () => {
	const d = new Date()
	return `${zeroFirst(d.getDate())}.${zeroFirst(d.getMonth() + 1)}.${d.getFullYear()} ${zeroFirst(
		d.getHours()
	)}:${zeroFirst(d.getMinutes())}:${zeroFirst(d.getSeconds())}`
}

const msToTime = (ms = 0) => {
	const result = []
	const h = Math.floor(ms / 1000 / 60 / 60)
	const m = Math.floor((ms / 1000 / 60 / 60 - h) * 60)
	const s = Math.floor(((ms / 1000 / 60 / 60 - h) * 60 - m) * 60)

	if (h > 0) {
		result.push(h)
	}
	result.push(h > 0 ? zeroFirst(m) : m)
	result.push(zeroFirst(s))

	return result.join(":")
}

const getCaption = ({name, artists, progress, duration, showProgress, liked, isPaused}) =>
	[
		isPaused ? "⏸" : "🎵",
		`*${name}* — ${artists}`,
		liked && "❤️",
		showProgress && !isPaused && `\\[${progress}/${duration}]`,
	]
		.filter(item => typeof item === "string" && item.length > 0)
		.join(" ")

const getSongLog = ({name, artists}) => `${name} — ${artists}`

const getReplyMarkup = ({/*url, */ id}) => ({
	inline_keyboard: [
		[
			/*{
				text: "Spotify",
				url: url,
			},
			{
				text: "Другие сервисы",
				url: `https://song.link/s/${id}`,
			},*/
			{
				text: "Слушать",
				url: `https://song.link/s/${id}`,
			},
		],
	],
})

const log = {
	red: (...args) => {
		logger
			.color("white")
			.bgColor("red")
			.log(getDateString(), ...args)
	},
	green: (...args) => {
		logger
			.color("white")
			.bgColor("green")
			.log(getDateString(), ...args)
	},
	def: (...args) => {
		logger
			.color("yellow")
			.bold()
			.log(getDateString(), ...args)
	},
}

const config = {
	read: () => {
		return JSON.parse(fs.readFileSync(configDir))
	},
	write: json => {
		fs.writeFileSync(configDir, JSON.stringify(json, null, "\t"))
	},
	get: key => {
		const configJson = config.read()
		return configJson[key]
	},
	set: (key, value) => {
		const configJson = config.read()
		configJson[key] = value
		config.write(configJson)
	},
}

module.exports = {
	response,
	zeroFirst,
	msToTime,
	getCaption,
	getSongLog,
	getReplyMarkup,
	getDateString,
	log,
	config,
	configDir,
}
