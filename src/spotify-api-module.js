const SpotifyWebApi = require("spotify-web-api-node")
const { config } = require("./utils.js")

const configVars = config.read()
const spotifyApi = new SpotifyWebApi({
	clientId: configVars.clientId,
	clientSecret: configVars.clientSecret,
	redirectUri: configVars.redirectUri,
	accessToken: configVars.accessToken,
	refreshToken: configVars.refreshToken
})
//setCredentials

const refreshAccessToken = async () => {
	try {
		const response = await spotifyApi.refreshAccessToken()
		const token = response.body.access_token
		spotifyApi.setAccessToken(token)
		config.set("accessToken", token)
		console.log("Access token has been successfully refreshed!")
		return token
	}
	catch(err) {
		console.log(err)
		return false
	}
}

const spotifyApi_ = {}
for (const key in spotifyApi) {
	if (typeof spotifyApi[key] === "function") {
		spotifyApi_[key] = async (...args) => {
			try {
				return await spotifyApi[key](...args)
			}
			catch(err) {
				if (err.statusCode === 401) {
					const isTokenRefreshed = await refreshAccessToken()
					if (isTokenRefreshed) {
						return await spotifyApi[key](...args)
					}
					else {
						console.log("Couldn't refresh token:", err)
						return err
					}
				}
				else {
					console.log("Unknown error:", err)
					return err
				}
			}
		}
	}
	else {
		spotifyApi_[key] = spotifyApi[key]
	}
}

module.exports = spotifyApi_
