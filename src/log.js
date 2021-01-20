const logger = require("node-color-log");

const getDateString = () => {
	const zeroFirst = s => {
		return `0${s}`.substr(-2)
	}
	let d = new Date()
	return `${zeroFirst(d.getDate())}.${zeroFirst(d.getMonth() + 1)}.${d.getFullYear()} ${zeroFirst(d.getHours())}.${zeroFirst(d.getMinutes())}.${zeroFirst(d.getSeconds())}`
}

module.exports = {
	red: (...args) => {
		logger.color("white").bgColor("red").log(getDateString() + ":", ...args);
	},
	green: (...args) => {
		logger.color("white").bgColor("green").log(getDateString() + ":", ...args);
	},
	def: (...args) => {
		logger.color("yellow").bold().log(getDateString() + ":", ...args);
	},
}