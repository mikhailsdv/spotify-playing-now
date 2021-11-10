const { config, log, answer, msToTime } = require("./utils.js")
const { Telegraf, Telegram } = require("telegraf")
const spotifyApi = require("./spotify-api-module")

const configVars = config.read()

const telegram = new Telegram(configVars.botToken)
const bot = new Telegraf(configVars.botToken)

let prevSong = {//template, example
	id: null,
	name: null,
	artists: null,
	image: null,
	url: null,
	duration: null,
	progress: null,
	update: null,
}

const getCaption = (name, artists, progress, duration, isPaused) => `${isPaused ? "⏸" : "🎵"} *${name}* — ${artists} ${isPaused ? "" : `\\[${progress}/${duration}]`}`
const getSongLog = (name, artists) => `${name} — ${artists}`
const getReplyMarkup = ({url, id}) => ({
	inline_keyboard: [[
		{
			text: "Spotify",
			url: url
		},
		{
			text: "Другие сервисы",
			url: `https://song.link/s/${id}`
		}
	]]
})

const getMyCurrentPlaybackState = async () => {
	try {
		let data = await spotifyApi.getMyCurrentPlaybackState({})
		if (data.statusCode === 200) {
			let body = data.body
			let artists = body.item.artists.map(artist => artist.name).join(", ")
			let progress = msToTime(body.progress_ms)
			let duration = msToTime(body.item.duration_ms)
			if (prevSong.id !== body.item.id) {
				prevSong = {
					id: body.item.id,
					name: body.item.name,
					artists: artists,
					image: body.item.album.images[0].url,
					url: body.item.external_urls.spotify,
					duration: duration,
					progress: progress,
					update: "all",
				}
				return answer(true, prevSong) //actually current song
			}
			else if (
				prevSong.id === body.item.id &&
				prevSong.progress !== progress
			) {
				prevSong.update = "caption"
				prevSong.progress = progress
				return answer(true, prevSong) //actually current song
			}
			else {
				return answer(false, {
					message: "paused",
					data: data,
				})
			}
		}
		else {
			if (data.statusCode === 204) {
				return answer(false, {
					message: "paused",
					data: data,
				})
			}
			else {
				return answer(false, {
					message: "Status code is not 200",
					data: data
				})
			}
		}
	}
	catch(err) {
		return answer(false, {
			message: "Something went wrong",
			data: err.toString()
		})
	}
}

const start = () => {
	let messageId = configVars.messageId
	let wasPaused = false
	const editMessage = async () => {
		const playingNow = await getMyCurrentPlaybackState()
		if (playingNow.status) {
			let song = playingNow.data
			if (messageId) {
				try {
					if (song.update === "all") {
						log.def(getSongLog(song.name, song.artists))
						await telegram.editMessageMedia(
							configVars.chanelId,
							messageId,
							null,
							{
								type: "photo",
								media: song.image,
								caption: getCaption(song.name, song.artists, song.progress, song.duration, false),
							},
							{
								reply_markup: getReplyMarkup(song),
								parse_mode: "Markdown",
							}
						)
					}
					else if (song.update === "caption") {
						wasPaused && log.def(getSongLog(song.name, song.artists))
						await telegram.editMessageCaption(
							configVars.chanelId,
							messageId,
							null,
							getCaption(song.name, song.artists, song.progress, song.duration, false),
							{
								reply_markup: getReplyMarkup(song),
								parse_mode: "Markdown",
							}
						)
					}
					setTimeout(editMessage, configVars.updateDelay)
				}
				catch(err) {
					console.log(err)
					log.def(`Retrying after ${configVars.retryDelay}ms...`)
					setTimeout(editMessage, configVars.updateDelay)
				}
			}
			else {
				log.def(getSongLog(song.name, song.artists))
				let message = await telegram.sendPhoto(configVars.chanelId, song.image, {
					caption: getCaption(song.name, song.artists, song.progress, song.duration, false),
					parse_mode: "Markdown",
					reply_markup: getReplyMarkup(song)
				})
				messageId = message.message_id
				config.set("messageId", messageId)
				setTimeout(editMessage, configVars.updateDelay)
			}
			wasPaused = false
		}
		else if (playingNow.error.message === "paused") {
			if (!wasPaused) {
				log.def("Paused.")
				wasPaused = true
				prevSong.id && await telegram.editMessageCaption(
					configVars.chanelId,
					messageId,
					null,
					getCaption(prevSong.name, prevSong.artists, null, null, true),
					{
						reply_markup: getReplyMarkup(prevSong),
						parse_mode: "Markdown",
					}
				)
			}
			setTimeout(editMessage, configVars.pauseDelay)
		}
		else {
			log.red(playingNow.error.message)
			log.red(playingNow.error.data)
			log.def(`Retrying after ${configVars.retryDelay}ms...`)
			setTimeout(editMessage, configVars.retryDelay)
		}
	}
	editMessage()
}

start()
