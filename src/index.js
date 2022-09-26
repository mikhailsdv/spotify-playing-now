const {
	log,
	config,
	response,
	msToTime,
	getCaption,
	getSongLog,
	getReplyMarkup,
} = require("./utils.js")
const {Telegram} = require("telegraf")
const spotifyApi = require("./spotify-api-module")

const env = config.read()

const telegram = new Telegram(env.botToken)

let prevSong = {
	//template, example
	id: null,
	name: null,
	artists: null,
	image: null,
	url: null,
	duration: null,
	progress: null,
	update: null,
	liked: null,
}

const getMyCurrentPlaybackState = async () => {
	try {
		const data = await spotifyApi.getMyCurrentPlaybackState()
		if (data.statusCode === 200) {
			const body = data.body
			const artists = body.item.artists.map(artist => artist.name).join(", ")
			const progress = msToTime(body.progress_ms)
			const duration = msToTime(body.item.duration_ms)

			if (prevSong.id !== body.item.id) {
				const containsMySavedTracks = await spotifyApi.containsMySavedTracks([body.item.id])
				prevSong = {
					id: body.item.id,
					name: body.item.name,
					artists: artists,
					image: body.item.album.images[0].url,
					url: body.item.external_urls.spotify,
					duration: duration,
					progress: progress,
					update: "all",
					liked: containsMySavedTracks.body[0],
				}
				return response(true, prevSong) //actually current song
			} else if (prevSong.id === body.item.id && prevSong.progress !== progress) {
				prevSong.update = env.showProgress ? "caption" : "nothing"
				prevSong.progress = progress
				return response(true, prevSong) //actually current song
			} else {
				return response(false, {
					message: "paused",
					data: data,
				})
			}
		} else if (data.statusCode === 204) {
			return response(false, {
				message: "paused",
				data: data,
			})
		} else {
			return response(false, {
				message: "Status code is not 200",
				data: data,
			})
		}
	} catch (err) {
		return response(false, {
			message: "Something went wrong",
			data: err.toString(),
		})
	}
}

const start = () => {
	let messageId = env.messageId
	let wasPaused = false
	const editMessage = async () => {
		try {
			const playingNow = await getMyCurrentPlaybackState()
			if (playingNow.status) {
				const song = playingNow.data
				const caption = getCaption({
					name: song.name,
					artists: song.artists,
					showProgress: env.showProgress,
					progress: song.progress,
					duration: song.duration,
					liked: song.liked,
					isPaused: false,
				})
				const extra = {
					reply_markup: getReplyMarkup(song),
					parse_mode: "Markdown",
				}
				if (messageId) {
					if (song.update === "all") {
						log.def(getSongLog({name: song.name, artists: song.artists}))
						await telegram.editMessageMedia(
							env.chanelId,
							messageId,
							null,
							{
								type: "photo",
								media: song.image,
								caption,
							},
							extra
						)
					} else if (song.update === "caption") {
						wasPaused && log.def(getSongLog({name: song.name, artists: song.artists}))
						await telegram.editMessageCaption(
							env.chanelId,
							messageId,
							null,
							caption,
							extra
						)
					}
					setTimeout(editMessage, env.updateDelay)
				} else {
					log.def(getSongLog({name: song.name, artists: song.artists}))
					const message = await telegram.sendPhoto(env.chanelId, song.image, {
						caption,
						...extra,
					})
					messageId = message.message_id
					config.set("messageId", messageId)
					setTimeout(editMessage, env.updateDelay)
				}
				wasPaused = false
			} else if (playingNow.error.message === "paused") {
				if (!wasPaused) {
					log.def("Paused.")
					wasPaused = true
					prevSong.id &&
						(await telegram.editMessageCaption(
							env.chanelId,
							messageId,
							null,
							getCaption({
								name: prevSong.name,
								artists: prevSong.artists,
								progress: null,
								duration: null,
								liked: prevSong.liked,
								isPaused: true,
							}),
							{
								reply_markup: getReplyMarkup(prevSong),
								parse_mode: "Markdown",
							}
						))
				}
				setTimeout(editMessage, env.pauseDelay)
			} else {
				log.red(playingNow.error.message)
				log.red(playingNow.error.data)
				log.def(`Retrying after ${env.retryDelay}ms...`)
				setTimeout(editMessage, env.retryDelay)
			}
		} catch (err) {
			log.red(err)
			log.def(`Retrying after ${env.retryDelay}ms...`)
			setTimeout(editMessage, env.updateDelay)
		}
	}
	editMessage()
}

start()
