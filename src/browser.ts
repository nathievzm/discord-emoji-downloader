import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer'

/**
 * A wrapper around Puppeteer Browser that implements the AsyncDisposable interface.
 */
export interface DisposableBrowser extends AsyncDisposable {
	browser: Browser
}

/**
 * Launches a Puppeteer browser instance wrapped in an AsyncDisposable object.
 *
 * @param {LaunchOptions} options - The Puppeteer launch options.
 * @returns {Promise<DisposableBrowser>} A promise that resolves to the disposable browser wrapper.
 */
export const launchBrowser = async (options: LaunchOptions = { headless: false }): Promise<DisposableBrowser> => {
	const browser = await puppeteer.launch(options)
	return {
		browser,
		[Symbol.asyncDispose]: async () => {
			await browser.close()
		}
	}
}
