const config = require("./config")
const log = require("./log")
const SpotifyWebApi = require("spotify-web-api-node")

const spotifyApi = new SpotifyWebApi({
	clientId: config.clientId,
	redirectUri: config.redirectUri,
})

const start = (process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open")
require("child_process").exec(`${start} ${spotifyApi.createAuthorizeURL(["user-read-playback-state"]).replace(/&/g, "^&")}`)
