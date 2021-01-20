const config = require("./config")
const log = require("./log")
const db = require("./db.js")
const { answer, msToTime } = require("./functions")
const { Telegraf, Telegram } = require("telegraf")
const qs = require("querystring")
const SpotifyWebApi = require("spotify-web-api-node");

const telegram = new Telegram(config.botToken)
const bot = new Telegraf(config.botToken)

const spotifyApi = new SpotifyWebApi({
	clientId: config.clientId,
	clientSecret: config.clientSecret,
});
spotifyApi.setAccessToken(db.get("accessToken"))

let prevSong = {//template, example
	name: null,
	artists: null,
	image: null,
	url: null,
	duration: null,
	progress: null,
	update: null,
}

const getCaption = (name, artists, progress, duration) => `🎵 *${name}* — ${artists} \\[${progress}/${duration}]`
const getReplyMarkup = url => ({
	inline_keyboard: [[
		{
			text: "Открыть в Spotify",
			url: url
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
			//console.log(body)
			if (
				prevSong.artists !== artists ||
				prevSong.name !== body.item.name
			) {
				prevSong = {
					name: body.item.name,
					artists: artists,
					image: body.item.album.images[0].url,
					url: body.item.external_urls.spotify,
					duration: duration,
					progress: progress,
					update: "image",
				}
				return answer(true, prevSong) //actually current song
			}
			else if (
				prevSong.artists === artists &&
				prevSong.name === body.item.name &&
				(
					prevSong.progress !== progress ||
					prevSong.duration !== duration
				)
			) {
				prevSong.update = "caption"
				prevSong.duration = duration
				prevSong.progress = progress
				return answer(true, prevSong) //actually current song
			}
			else {
				prevSong.update = false
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
		if (err.statusCode === 401) {
			try {
				let data = await spotifyApi.refreshAccessToken()
				let token = data.body["access_token"]
				spotifyApi.setAccessToken(token);
				db.set("accessToken", token)
				log.green("The access token has been refreshed!");
				log.def(token)
				//retrying
				return await getMyCurrentPlaybackState()
			}
			catch(err) {
				return answer(false, {
					message: "Could not refresh access token",
					data: err
				})
			}
		}
		else {//can't fix
			return answer(false, {
				message: "Something went wrong",
				data: err
			})
		}
	}
}

const start = async () => {
	let messageId = db.get("messageId")
	const editMessage = async () => {
		let playingNow = await getMyCurrentPlaybackState()
		if (playingNow.status) {
			let song = playingNow.data
			if (!song.update) {
				setTimeout(editMessage, config.updateDelay)
				return
			}
			if (messageId) {
				try {
					if (song.update === "image") {
						log.def(`${song.name} — ${song.artists}`);
						await telegram.editMessageMedia(
							config.chanelId,
							messageId,
							null,
							{
								type: "photo",
								media: song.image,
								caption: getCaption(song.name, song.artists, song.progress, song.duration),
							},
							{
								reply_markup: getReplyMarkup(song.url),
								parse_mode: "Markdown",
							}
						)
					}
					else if (song.update === "caption") {
						await telegram.editMessageCaption(
							config.chanelId,
							messageId,
							null,
							getCaption(song.name, song.artists, song.progress, song.duration),
							{
								reply_markup: getReplyMarkup(song.url),
								parse_mode: "Markdown",
							}
						)
					}
					setTimeout(editMessage, config.updateDelay)
				}
				catch(err) {
					log.red(err)
					log.def("retrying...")
					setTimeout(editMessage, config.updateDelay)
				}
			}
			else {
				let message = await telegram.sendPhoto(config.chanelId, song.image, {
					caption: getCaption(song.name, song.artists, song.progress, song.duration),
					parse_mode: "Markdown",
					reply_markup: getReplyMarkup(song.url)
				})
				messageId = message.message_id
				db.set("messageId", messageId)
				setTimeout(editMessage, config.updateDelay)
			}
		}
		else if (playingNow.error.message === "paused") {
			log.def("paused")
			setTimeout(editMessage, config.pauseDelay)
		}
		else {
			log.red(playingNow.error.message)
			log.red(playingNow.error.data)
			log.def("retrying...")
			setTimeout(editMessage, config.retryDelay)
		}
	}
	editMessage()
}

start()
