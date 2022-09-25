const puppeteer = require("puppeteer-extra")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin())

const auth = spotifyApi =>
	new Promise(resolve => {
		// eslint-disable-next-line no-extra-semi
		;(async () => {
			try {
				const url = await spotifyApi.createAuthorizeURL([
					"user-read-playback-state",
					"user-library-read",
				])
				const browser = await puppeteer.launch({headless: false})
				const page = await browser.newPage()
				await page.goto(url, {
					waitUntil: "networkidle2",
				})

				page.on("framenavigated", async frame => {
					const frameUrl = frame.url()
					if (/https?:\/\/.+?\?code=./.test(frameUrl)) {
						const code = frame.url().replace(/.+?\/\?code=/, "")
						browser.close()
						const response = await spotifyApi.authorizationCodeGrant(code)
						const result = {
							accessToken: response.body.access_token,
							refreshToken: response.body.refresh_token,
						}
						return resolve(result)
					}
				})
			} catch (err) {
				console.log(err)
				return resolve(false)
			}
		})()
	})

module.exports = auth
