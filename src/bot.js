require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
} = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');

const playdl = require('play-dl');

// Per-guild music queues
// Map<guildId, { connection, player, songs: Array<Track>, playing: boolean, textChannelId: string }>
const queues = new Map();

/**
 * @typedef {Object} Track
 * @property {string} title
 * @property {string} url
 * @property {string} requestedBy
 */

/**
 * Ensure a queue object exists for this guild and set up the audio player.
 */
function getOrCreateQueue(interaction) {
  const guildId = interaction.guild.id;
  let queue = queues.get(guildId);

  if (!queue) {
    const voiceChannel = interaction.member.voice.channel;
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    connection.subscribe(player);

    queue = {
      connection,
      player,
      songs: [],
      playing: false,
      textChannelId: interaction.channel.id,
    };

    // When the current track ends, automatically move to the next one
    player.on(AudioPlayerStatus.Idle, () => {
      if (queue.songs.length > 0) {
        playNext(interaction.guild.id).catch(console.error);
      } else {
        queue.playing = false;
      }
    });

    player.on('error', (error) => {
      console.error('Audio player error:', error);
      if (queue.songs.length > 0) {
        playNext(interaction.guild.id).catch(console.error);
      }
    });

    queues.set(guildId, queue);
  }

  return queue;
}

/**
 * Play the next song in the guild queue.
 */
async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  const nextTrack = queue.songs.shift();
  if (!nextTrack) {
    queue.playing = false;
    return;
  }

  try {
    // Refresh YouTube cookies/session if needed
    if (playdl.is_expired && await playdl.is_expired()) {
      await playdl.refreshToken();
    }

    const stream = await playdl.stream(nextTrack.url, { discordPlayerCompatibility: true });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    queue.player.play(resource);
    queue.playing = true;

    const channel = await getTextChannel(queue, guildId);
    if (channel) {
      channel.send(`▶️ Now playing: **${nextTrack.title}** (requested by ${nextTrack.requestedBy})`).catch(() => {});
    }
  } catch (error) {
    console.error('Error while trying to play track:', error);
    const channel = await getTextChannel(queue, guildId);
    if (channel) {
      channel.send('⚠️ There was an error playing that track, skipping to the next one.').catch(() => {});
    }
    if (queue.songs.length > 0) {
      await playNext(guildId);
    } else {
      queue.playing = false;
    }
  }
}

async function getTextChannel(queue, guildId) {
  try {
    const client = globalThis.discordClient;
    if (!client || !guildId || !queue?.textChannelId) return null;
    const guild = await client.guilds.fetch(guildId);
    return guild.channels.fetch(queue.textChannelId);
  } catch {
    return null;
  }
}

/**
 * Resolve a YouTube link or search query into a Track.
 * @param {string} query
 * @param {string} requestedBy
 * @returns {Promise<Track>}
 */
async function resolveTrack(query, requestedBy) {
  let videoUrl;
  let title;

  const trimmed = query.trim();

  try {
    const validation = playdl.yt_validate(trimmed);

    if (validation === 'video') {
      const info = await playdl.video_basic_info(trimmed);
      videoUrl = info.video_details.url;
      title = info.video_details.title;
    } else {
      const results = await playdl.search(trimmed, {
        source: { youtube: 'video' },
        limit: 1,
      });

      if (!results || results.length === 0) {
        throw new Error('No search results');
      }

      const first = results[0];
      videoUrl = first.url;
      title = first.title;
    }
  } catch (error) {
    console.error('Error resolving track from query:', error);
    throw new Error('Could not find a playable YouTube video for that query.');
  }

  return {
    title: title || 'Unknown title',
    url: videoUrl,
    requestedBy,
  };
}

/**
 * Handle /play command
 */
async function handlePlay(interaction) {
  const query = interaction.options.getString('query', true);

  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ You need to be in a voice channel to use /play.',
      ephemeral: true,
    });
  }

  const botVoiceConnection = getVoiceConnection(interaction.guild.id);
  if (botVoiceConnection && botVoiceConnection.joinConfig.channelId !== voiceChannel.id) {
    return interaction.reply({
      content: '❌ I am already playing music in a different voice channel.',
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  let track;
  try {
    track = await resolveTrack(query, interaction.user.tag);
  } catch (error) {
    return interaction.editReply({
      content: `❌ ${error.message}`,
    });
  }

  const queue = getOrCreateQueue(interaction);
  queue.songs.push(track);

  if (!queue.playing) {
    await playNext(interaction.guild.id);
    return interaction.editReply(`▶️ Now playing **${track.title}**`);
  }

  return interaction.editReply(
    `✅ Added to queue: **${track.title}** (position ${queue.songs.length})`
  );
}

/**
 * Handle /pause command
 */
async function handlePause(interaction) {
  const queue = queues.get(interaction.guild.id);
  if (!queue || !queue.playing) {
    return interaction.reply({
      content: '❌ Nothing is currently playing.',
      ephemeral: true,
    });
  }

  const success = queue.player.pause(true);
  if (!success) {
    return interaction.reply({
      content: '⚠️ I could not pause the player (maybe it is already paused?).',
      ephemeral: true,
    });
  }

  return interaction.reply('⏸️ Paused the current song.');
}

/**
 * Handle /resume command
 */
async function handleResume(interaction) {
  const queue = queues.get(interaction.guild.id);
  if (!queue) {
    return interaction.reply({
      content: '❌ Nothing is currently playing.',
      ephemeral: true,
    });
  }

  const success = queue.player.unpause();
  if (!success) {
    return interaction.reply({
      content: '⚠️ I could not resume the player (maybe it is not paused?).',
      ephemeral: true,
    });
  }

  return interaction.reply('▶️ Resumed playback.');
}

/**
 * Handle /skip command
 */
async function handleSkip(interaction) {
  const queue = queues.get(interaction.guild.id);
  if (!queue || !queue.playing) {
    return interaction.reply({
      content: '❌ Nothing is currently playing.',
      ephemeral: true,
    });
  }

  queue.player.stop(true);
  return interaction.reply('⏭️ Skipped the current song.');
}

/**
 * Handle /clear command
 */
async function handleClear(interaction) {
  const queue = queues.get(interaction.guild.id);
  if (!queue) {
    return interaction.reply({
      content: '❌ There is no active queue to clear.',
      ephemeral: true,
    });
  }

  queue.songs = [];
  queue.player.stop(true);

  const connection = getVoiceConnection(interaction.guild.id);
  if (connection) {
    connection.destroy();
  }

  queues.delete(interaction.guild.id);

  return interaction.reply('🧹 Cleared the queue and left the voice channel.');
}

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Make client globally accessible so we can find text channels from the player
globalThis.discordClient = client;

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'play') {
      await handlePlay(interaction);
    } else if (interaction.commandName === 'pause') {
      await handlePause(interaction);
    } else if (interaction.commandName === 'resume') {
      await handleResume(interaction);
    } else if (interaction.commandName === 'skip') {
      await handleSkip(interaction);
    } else if (interaction.commandName === 'clear') {
      await handleClear(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.deferred || interaction.replied) {
      interaction.editReply('❌ There was an error while executing that command.').catch(() => {});
    } else {
      interaction.reply({
        content: '❌ There was an error while executing that command.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set in your .env file.');
  process.exit(1);
}

client.login(token);

