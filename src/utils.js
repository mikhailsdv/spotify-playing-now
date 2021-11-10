const logger = require("node-color-log")
const fs = require("fs")
//const configFile = "./config.test.json"
const configFile = "./config.json"

const answer = (status, data) => {
	return {
		status: status,
		[status ? "data" : "error"]: data,
	}
}

const zeroFirst = number => {
	let offset = 2
	let numberLength = String(number).length
	if (numberLength > offset) {
		offset = numberLength
	}
	return `0${number}`.substr(-offset)
}

const getDateString = () => {
	let d = new Date()
	return `${zeroFirst(d.getDate())}.${zeroFirst(d.getMonth() + 1)}.${d.getFullYear()} ${zeroFirst(d.getHours())}:${zeroFirst(d.getMinutes())}:${zeroFirst(d.getSeconds())}`
}

const msToTime = (ms = 0) => {
	let result = []
	let h = Math.floor(ms / 1000 / 60 / 60);
	let m = Math.floor((ms / 1000 / 60 / 60 - h) * 60);
	let s = Math.floor(((ms / 1000 / 60 / 60 - h) * 60 - m) * 60);

	if (h > 0) {
		result.push(h)
	}
	result.push(h > 0 ? zeroFirst(m) : m)
	result.push(zeroFirst(s))

	return result.join(":")
}

const log = {
	red: (...args) => {
		logger.color("white").bgColor("red").log(getDateString(), ...args);
	},
	green: (...args) => {
		logger.color("white").bgColor("green").log(getDateString(), ...args);
	},
	def: (...args) => {
		logger.color("yellow").bold().log(getDateString(), ...args);
	},
}

const config = {
	read: () => {
		return JSON.parse(fs.readFileSync(configFile))
	},
	write: json => {
		fs.writeFileSync(configFile, JSON.stringify(json))
	},
	get: key => {
		let configJson = config.read()
		return configJson[key]
	},
	set: (key, value) => {
		let configJson = config.read()
		configJson[key] = value
		config.write(configJson)
	}
}

module.exports = {
	answer,
	zeroFirst,
	msToTime,
	getDateString,
	log,
	config,
}
