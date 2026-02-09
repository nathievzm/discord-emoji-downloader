import { mkdir } from 'fs/promises'
import { env } from './env'
import { config } from './config'
import { delay } from './utils'
import { loginToDiscord, handle2FA, navigateToServer, navigateToChannel, openEmojiPicker } from './discord'
import { extractEmojiUrls, downloadAndProcessEmojis } from './emoji-processor'
import { launchBrowser } from './browser'

// Log the initial state of the emojis folder
const outputDirExists: boolean = await Bun.file(config.outputBaseDir).exists()
console.log(`Emojis folder (${config.outputBaseDir}) exists: ${outputDirExists}`)

// Ensure base output directory exists using fs.mkdir, but don't delete it if it exists
if (!outputDirExists) {
	await mkdir(config.outputBaseDir, { recursive: true })
	console.log(`Created output directory: ${config.outputBaseDir}`)
} else {
	console.log(`Emojis folder already exists, skipping creation: ${config.outputBaseDir}`)
}

// Create a folder for each server if it doesn't exist
await Promise.all(
	env.servers.map(async server => {
		const serverDir: string = config.outputBaseDir + '/' + server.folder
		const serverDirExists: boolean = await Bun.file(serverDir).exists()
		if (!serverDirExists) {
			await mkdir(serverDir, { recursive: true })
			console.log(`Created server directory: ${serverDir}`)
		} else {
			console.log(`Server directory already exists, skipping creation: ${serverDir}`)
		}
	})
)

try {
	// Launch Puppeteer with Explicit Resource Management
	await using browserRef = await launchBrowser({ headless: false }) // Set to true for headless mode
	const { browser } = browserRef
	const page = await browser.newPage()

	// Step 1: Log in to Discord
	await loginToDiscord(page, env.discordEmail, env.discordPassword)

	// Step 2: Handle 2FA if present
	await handle2FA(page)

	// Step 3: Process each server
	for (const server of env.servers) {
		console.log(`Processing server: ${server.name}...`)

		// Step 3.1: Navigate to the server
		await navigateToServer(page, server.name)

		// Step 3.2: Navigate to the specified channel
		await navigateToChannel(page, server.name, server.channel)

		// Step 3.3: Open the emoji picker and switch to the server tab
		const emojiButtonSelector: string = await openEmojiPicker(page, server.name)

		// Step 3.4: Extract emoji URLs and names
		const emojis: { url: string; name: string }[] = await extractEmojiUrls(page, server.name)
		console.log(`Found ${emojis.length} emojis in ${server.name}.`)

		// Step 3.5: Download, resize, and convert emojis to .webp
		await downloadAndProcessEmojis(emojis, server, config.outputBaseDir, env.emojiSize)

		// Close the emoji picker before moving to the next server
		await page.click(emojiButtonSelector) // Click the emoji button again to close the picker
		await delay(1000)
	}

	console.log('All emojis from all servers have been downloaded and processed!')
} catch (err) {
	console.error('An error occurred:', (err as Error).message)
}
// Browser is automatically closed here
