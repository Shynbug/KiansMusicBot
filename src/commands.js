const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube by URL or search keywords.')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('YouTube URL or search keywords')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song.'),
  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current song.'),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song.'),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear the queue and stop playback.')
].map(command => command.toJSON());

module.exports = { commands };

