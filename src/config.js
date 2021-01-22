module.exports = ({
	botToken: "", //you token from botfather
	clientId: "", //Client ID from Spotify
	clientSecret: "", //Client Secret from Spotify
	redirectUri: "https://example.com/",
	code: "",
	chanelId: 0000000, //id of your Telegram chat or channel
	updateDelay: 4000, //delay between time updates while playing
	pauseDelay: 10000, //delay after pausing music
	retryDelay: 3000, //delay after connection error
})