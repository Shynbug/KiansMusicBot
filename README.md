## Kian's Discord Music Bot

A simple self-hosted Discord music bot for you and your friends.

- **/play**: Paste a YouTube link or type a search query to play music
- **/pause**: Pause the current song
- **/resume**: Resume the paused song
- **/skip**: Skip the current song
- **/clear**: Clear the queue and make the bot leave the voice channel

Built with `discord.js`, `@discordjs/voice`, and `play-dl`.

---

### 1. Requirements

- **Node.js**: Version **18 or newer** (LTS recommended)
- A **Discord account**
- Permission to **add a bot** to your server
- Windows 10+ (you’re on Windows 10, so you’re good)

---

### 2. Create your Discord application & bot

1. Go to the Discord Developer Portal: `https://discord.com/developers/applications`
2. Click **New Application** and give it a name (e.g. `Kian Music Bot`).
3. In the left sidebar, go to **Bot**:
   - Click **Add Bot** and confirm.
   - Under **Token**, click **Reset Token** or **Copy**, and save it somewhere safe.
   - (Optional but fine) Enable **Privileged Gateway Intents** if you see them, though this bot does not rely on member intents.
4. In the left sidebar, go to **OAuth2 → General** and copy the **Application ID** (this is your `CLIENT_ID`).

---

### 3. Invite the bot to your server

1. In the developer portal, go to **OAuth2 → URL Generator**.
2. Under **Scopes**, tick:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, tick at least:
   - `Connect`
   - `Speak`
   - `View Channel`
4. Copy the generated URL, open it in your browser, choose your server, and **Authorize**.

---

### 4. Set up the project locally (Windows)

Open **PowerShell** and run:

```powershell
cd "C:\Kian's Music Bot"
npm install
```

This will install all required dependencies listed in `package.json`.

Now create a `.env` file in `C:\Kian's Music Bot` with the following content (replace placeholders):

```ini
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id_here
DISCORD_GUILD_ID=your_server_id_here
```

- **DISCORD_TOKEN**: From the **Bot** tab in the developer portal.
- **DISCORD_CLIENT_ID**: From the **General Information** tab (Application ID).
- **DISCORD_GUILD_ID**: Your server ID:
  - In Discord, go to **Settings → Advanced → Developer Mode** and enable it.
  - Right‑click your server icon → **Copy Server ID**.

---

### 5. Register the slash commands

Run this once (or whenever you change commands) to register `/play`, `/pause`, `/resume`, `/skip`, and `/clear` for your server:

```powershell
cd "C:\Kian's Music Bot"
npm run deploy-commands
```

If everything is set correctly, you should see a success message in the console.

---

### 6. Start the bot

In PowerShell:

```powershell
cd "C:\Kian's Music Bot"
npm start
```

You should see a log line like:

```text
Logged in as YourBotName#1234
```

Leave this window open while you’re using the bot.

---

### 7. Using the bot on your server

1. Join a **voice channel** in your server.
2. In any text channel where the bot can read messages, use:

- **Play a YouTube link**

  ```text
  /play query: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  ```

- **Play by search**

  ```text
  /play query: never gonna give you up
  ```

- **Pause**

  ```text
  /pause
  ```

- **Resume**

  ```text
  /resume
  ```

- **Skip**

  ```text
  /skip
  ```

- **Clear queue and disconnect**

  ```text
  /clear
  ```

The bot will:

- Join your voice channel when you first `/play`
- Keep a per‑server queue
- Automatically move to the next song when one finishes
- Leave and clear everything when you `/clear`

---

### 8. Recommended next steps (optional)

- Run the bot on a small VPS or always‑on PC so it’s available to your friends anytime.
- Use something like `pm2` or a Windows scheduled task to keep it running after reboots.
- Add more commands (e.g. `/queue` to view upcoming songs, `/nowplaying`, etc.) using the same pattern as in `src/commands.js` and `src/bot.js`.

