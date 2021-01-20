const functions = {
	answer: (status, data) => {
		return {
			status: status,
			[status ? "data" : "error"]: data,
		}
	},
	zeroFirst: number => {
		let offset = 2
		let numberLength = String(number).length
		if (numberLength > offset) {
			offset = numberLength
		}
		return `0${number}`.substr(-offset)
	},
	msToTime: (ms = 0) => {
		let result = []
		let h = Math.floor(ms / 1000 / 60 / 60);
		let m = Math.floor((ms / 1000 / 60 / 60 - h) * 60);
		let s = Math.floor(((ms / 1000 / 60 / 60 - h) * 60 - m) * 60);

		if (h > 0) {
			result.push(h)
		}
		result.push(h > 0 ? functions.zeroFirst(m) : m)
		result.push(functions.zeroFirst(s))

		return result.join(":")
	}
}

module.exports = functions