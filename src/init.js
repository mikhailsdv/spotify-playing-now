const {config, configDir} = require("./utils")
const prompts = require("prompts")
const fs = require("fs")
const path = require("path")
const auth = require("./auth")
const SpotifyWebApi = require("spotify-web-api-node")
const puppeteer = require("puppeteer-extra")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin())

if (!fs.existsSync(configDir)) {
	fs.copyFileSync(path.resolve(__dirname, "./config.example.json"), configDir)
}

const env = config.read()

const questions = [
	{
		type: "text",
		name: "chanelId",
		message: "Insert your Telegram chat or channel ID:",
		initial: env.chanelId || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "text",
		name: "botToken",
		message: "Insert your Telegram bot token:",
		initial: env.botToken || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "text",
		name: "clientId",
		message: "Insert your Spotify app's Client ID:",
		initial: env.clientId || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "text",
		name: "clientSecret",
		message: "Insert your Spotify app's Client Secret:",
		initial: env.clientSecret || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "confirm",
		name: "browser",
		initial: true,
		message:
			"The browser is going to open. Log into you Spotify account to finish initialization. Press Enter to continue.",
		callback: async (prompt, answer, answers) => {
			if (answer !== true) {
				console.log("Ok, aborting.")
			}
			const spotifyApi = new SpotifyWebApi({
				clientId: answers.clientId,
				clientSecret: answers.clientSecret,
				redirectUri: env.redirectUri,
			})
			const authData = await auth(spotifyApi)
			if (authData) {
				config.set("accessToken", authData.accessToken)
				config.set("refreshToken", authData.refreshToken)
			} else {
				console.log("Couldn't authorize. Try again.")
			}
			return
		},
	},
]

const callbacks = (() => {
	const result = {}
	for (const question of questions) {
		if (question.callback) {
			result[question.name] = question.callback
			delete question.callback
		}
	}
	return result
})()

;(async () => {
	await prompts(questions.slice(), {
		onSubmit: async (prompt, answer, answers) => {
			if (callbacks[prompt.name]) {
				await callbacks[prompt.name](prompt, answer, answers)
			}
			return undefined
		},
	})
	console.log("Initialization successful! Staring main script...")
	require("./index.js")
})()
