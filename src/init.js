const {config} = require("./utils")
const prompts = require("prompts")
const auth = require("./auth")
const SpotifyWebApi = require("spotify-web-api-node")
const puppeteer = require("puppeteer-extra")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin())
const redirectUri = "https://example.com/"

const configVars = config.read()

const questions = [
	{
		type: "text",
		name: "chanelId",
		message: "Вставьте ID вашего канала или чата:",
		initial: configVars.chanelId || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "text",
		name: "botToken",
		message: "Вставьте токен вашего бота:",
		initial: configVars.botToken || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "text",
		name: "clientId",
		message: "Вставьте Client ID вашего приложения в Spotify:",
		initial: configVars.clientId || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "text",
		name: "clientSecret",
		message: "Вставьте Client Secret вашего приложения в Spotify:",
		initial: configVars.clientSecret || undefined,
		callback: (prompt, answer) => config.set(prompt.name, answer.trim()),
	},
	{
		type: "confirm",
		name: "browser",
		initial: true,
		message: "Сейчас откроется браузер. Войдите в свой аккаунт для завершения процесса инициализации. Нажмите Enter, чтобы продолжить.",
		callback: async (prompt, answer, answers) => {
			if (answer !== true) {
				console.log("Ок, отмена.")
			}
			const spotifyApi = new SpotifyWebApi({
				clientId: answers.clientId,
				clientSecret: answers.clientSecret,
				redirectUri: redirectUri,
			})
			const authData = await auth(spotifyApi)
			if (authData) {
				config.set("accessToken", authData.accessToken)
				config.set("refreshToken", authData.refreshToken)
			}
			else {
				console.log("Не удалось авторизоваться. Попробуйте еще раз.")
			}
			return
		}
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
	const answers = await prompts(questions.slice(), {
		onSubmit: async (prompt, answer, answers) => {
			if (callbacks[prompt.name]) {
				await callbacks[prompt.name](prompt, answer, answers)
			}
			return undefined
		}
	})
	console.log("Инициализация завершена успешно! Запуск основного скрипта...")
	require("./index.js")
})()
