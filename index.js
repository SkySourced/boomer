import { Client, GatewayIntentBits, Routes, PermissionFlagsBits, Collection } from 'discord.js' // importing required libraries from discord.js
import { REST } from '@discordjs/rest' // importing rest library from discord.js
import { SlashCommandBuilder } from '@discordjs/builders' // importing builder library from discord.js
import { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource } from '@discordjs/voice' // importing voice library from discord.js
import { readFile } from 'fs/promises' // importing fs/promises library

const CLIENT = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] }) // creating a new client

// importing from json
const CONFIG = JSON.parse(await readFile('./config.json', 'utf8')) // importing config
const TOKEN = JSON.parse(await readFile('./token.json', 'utf8')).token // importing token

const CLIENT_ID = CONFIG.client_id // client id

const enableResponse = CONFIG.messages.soundEnableResponse // importing soundEnableResponse from config.json
const disableResponse = CONFIG.messages.soundDisableResponse // importing soundDisableResponse from config.json
const publicResponse = CONFIG.messages.soundPublicResponse // importing soundPublicResponse from config.json
const privateResponse = CONFIG.messages.soundPrivateResponse // importing soundPrivateResponse from config.json
const repoResponse = CONFIG.messages.repoResponse // importing repoResponse from config.json
const vineboomResponse = CONFIG.messages.vineboomResponse // importing vineboomResponse from config.json
const objectionResponse = CONFIG.messages.objectionResponse // importing objectionResponse from config.json
const maxInterval = CONFIG.frequency // importing frequency from config.json

const vineboomPath = CONFIG.paths.vineboom // path to the vineboom sound effect
const objectionPath = CONFIG.paths.objection // path to the objection sound effect
// const fillerPath = CONFIG.paths.filler // path to the 1hz sound effect

// player def
const vineBoomPlayer = createAudioPlayer()
const objectionPlayer = createAudioPlayer()
let resource

vineBoomPlayer.on('error', error => {
  console.error(error)
})
objectionPlayer.on('error', error => {
  console.error(error)
})

const rest = new REST({ version: '9' }).setToken(TOKEN) // creating a new rest client to sync slash commands

let enabled = true // if the bot is enabled or not
const guildDataStorage = new Collection()
/* guildDataStorage structure
  {
    "123456789012345": { // guild id
      members: ["123456789012345", "123456789012345"], // member ids of users in the voice channel
      channel: "123456789012345", // voice channel id,
      sfx: "vineboom" | "objection", // sound effect to play
      availablility: "public" | "private" // if the sound effect is available to everyone or only to admins
    }
  }
 */

const commands = [// creating an array of commands
  new SlashCommandBuilder() // creating a new command
    .setName('setstatus') // setting the name of the command
    .setDescription('Changes if the bot will play') // setting the description of the command
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages) // setting the minimum permissions of the command
    .addStringOption(botstatus => // adding user input
      botstatus.setName('botstatus') // setting the name of the option
        .setDescription('The functionality of the bot') // setting the description of the option
        .setRequired(true) // setting the option as required
        .addChoices( // adding choices to the option
          { name: 'enabled', value: 'enabled' }, // enabled choice
          { name: 'disabled', value: 'disabled' } // disabled choice
        )
    ),
  new SlashCommandBuilder() // creating a new command
    .setName('setavailablility') // setting the name of the command
    .setDescription('Changes if setstatus and setsfx are publicly available') // setting the description of the command
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // setting the minimum permissions of the command
    .addStringOption(availability => // adding user input
      availability.setName('availability') // setting the name of the option
        .setDescription('If other commands are publicly available') // setting the description of the option
        .setRequired(true) // setting the option as required
        .addChoices( // adding choices to the option
          { name: 'open the floodgates', value: 'public' }, // public choice
          { name: 'return to order', value: 'private' } // private choice
        )
    ),
  new SlashCommandBuilder() // creating a new command
    .setName('setsfx')
    .setDescription('Changes the sound effect that is played')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(sfx =>
      sfx.setName('sfx')
        .setDescription('The sound effect to play')
        .setRequired(true)
        .addChoices(
          { name: 'vine boom', value: 'vineboom' },
          { name: 'phoenix wright objection', value: 'objection' }
        )
    ),
  new SlashCommandBuilder() // creating a new command
    .setName('repo')
    .setDescription('Sends the link to the github repo, for information and bug reports')
]

async function syncGlobalSlashCommands () {
  // sync commands with discord
  try {
    console.log('Beginning to refresh global slash commands')
    await rest.put( // push to discord
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    )
    console.log('Successfully refreshed global slash commands')
  } catch (error) {
    console.error(error)
  }
}

async function syncSlashCommands (guildId) {
  // sync commands with discord
  try {
    console.log('Beginning to refresh slash commands')
    await rest.put( // push to discord
      Routes.applicationGuildCommands(CLIENT_ID, guildId),
      { body: commands }
    )
    console.log('Successfully refreshed slash commands')
  } catch (error) {
    console.error(error)
  }
}

/* function playFiller (player, amount, i) {
  resource = createAudioResource(fillerPath) // creating a new audio resource (1 second 1hz sound)
  player.play(resource) // playing the audio resource
  i++
  if (i < amount) {
    setTimeout(playFiller(player, amount, i), 1000) // playing the filler sound every second
  }
} */

function playVineBoom () {
  resource = createAudioResource(vineboomPath) // create audio resource (vineboom)
  vineBoomPlayer.play(resource) // play the audio
  setTimeout(resetVineBoom, 4000) // the sound effect is around 3 seconds long so this prevents the bot from playing the sound effect too frequently
}

function resetVineBoom () {
  vineBoomPlayer.stop(resource) // stop the audio (in case it hasn't finished playing (probably not necessary))
  const interval = Math.ceil(Math.random() * maxInterval * 60) // random interval from 0 to maxInterval (mins) so * 60 to get seconds
  // const i = 0 // counter
  // playFiller(vineBoomPlayer, interval, i) // play filler sound for the interval
  setTimeout(playVineBoom, interval) // play the sound effect again after a random amount of time
}

function playObjection () {
  resource = createAudioResource(objectionPath) // create audio resource (objection)
  objectionPlayer.play(resource) // play the audio
  setTimeout(resetObjection, 2000) // the sound effect is around 1 second long so this prevents the bot from playing the sound effect too frequently
}

function resetObjection () {
  objectionPlayer.stop(resource) // stop the audio (in case it hasn't finished playing (probably not necessary))
  const interval = Math.ceil(Math.random() * maxInterval * 60000) // random interval between 0 and 1200 seconds (20 mins)
  // const i = 0 // counter
  // playFiller(objectionPlayer, interval, i) // play filler sound for the interval
  setTimeout(playObjection, interval) // play the sound effect again after a random amount of time
}

function join (voiceState, cache) {
  const connection = joinVoiceChannel({
    channelId: voiceState.channelId,
    guildId: voiceState.guild.id,
    adapterCreator: voiceState.guild.voiceAdapterCreator
  })
  if (guildDataStorage.get(voiceState.guild.id).sfx === 'vineboom') {
    connection.subscribe(vineBoomPlayer)
  } else if (guildDataStorage.get(voiceState.guild.id).sfx === 'objection') {
    connection.subscribe(objectionPlayer)
  }
  guildDataStorage.set(voiceState.guild.id, cache)
  // console.log('joined channel ' + voiceState.channel.name + ' in ' + voiceState.guild.name);
}

function leave (voiceState, cache) {
  console.log('leaving')
  const connection = getVoiceConnection(voiceState.guild.id)
  if (connection) connection.destroy()
  cache.channel = null
  guildDataStorage.set(voiceState.guild.id, cache)
}

CLIENT.on('ready', async () => { // when the client is ready
  await syncGlobalSlashCommands() // sync commands with discord
  console.log(`Logged in as ${CLIENT.user.tag}!`) // log in the console that the client is ready
  playVineBoom() // start the audio players ready for connection
  playObjection()
  for (let i = 0; i < CLIENT.guilds.cache.size; i++) {
    guildDataStorage.set(CLIENT.guilds.cache.keyAt(i), { members: [], channel: null, sfx: 'vineboom', availability: 'private' })
  } // for each guild the client is in
  console.log('-- Guild Data Storage --')
  console.log(guildDataStorage)
})

CLIENT.on('interactionCreate', async interaction => { // when an interaction is created
  if (!interaction.isCommand()) return // if the interaction is not a slash command, stop

  if (interaction.commandName === 'setstatus') { // if the interaction is the setStatus command
    if (interaction.options.getString('botstatus') === 'enabled') { // if the interaction is enabled
      enabled = true // set enabled to true
      await interaction.reply({ content: enableResponse, ephemeral: true })
    } else if (interaction.options.getString('botstatus') === 'disabled') { // if the interaction is disabled
      enabled = false // set enabled to false
      const connection = getVoiceConnection(interaction.guild.id)
      if (connection) connection.destroy()
      const cache = guildDataStorage.get(interaction.guild.id)
      cache.channel = null
      guildDataStorage.set(interaction.guildId, cache)
      await interaction.reply({ content: disableResponse, ephemeral: true })
    }
  } else if (interaction.commandName === 'setavailablility') { // if the interaction is the setAvailablility command
    if (interaction.options.getString('availability') === 'public') { // if the interaction is public
      commands[0].setDefaultMemberPermissions(PermissionFlagsBits.SendMessages) // set the minimum permissions to low-level
      commands[2].setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
      const cache = guildDataStorage.get(interaction.guild.id)
      cache.availability = 'public'
      guildDataStorage.set(interaction.guildId, cache)
      await syncSlashCommands(interaction.guildId) // sync commands with discord
      await interaction.reply({ content: publicResponse, ephemeral: true })
    } else if (interaction.options.getString('availability') === 'private') { // if the interaction is private
      commands[0].setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // set the minimum permissions to administrator
      commands[2].setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      const cache = guildDataStorage.get(interaction.guild.id)
      cache.availability = 'private'
      guildDataStorage.set(interaction.guildId, cache)
      await syncSlashCommands(interaction.guildId) // sync commands with discord
      await interaction.reply({ content: privateResponse, ephemeral: true })
    }
  } else if (interaction.commandName === 'setsfx') {
    if (interaction.options.getString('sfx') === 'vineboom') {
      const cache = guildDataStorage.get(interaction.guild.id)
      cache.sfx = 'vineboom'
      guildDataStorage.set(interaction.guildId, cache)
      await interaction.reply({ content: vineboomResponse, ephemeral: true })
    } else if (interaction.options.getString('sfx') === 'objection') {
      const cache = guildDataStorage.get(interaction.guild.id)
      cache.sfx = 'objection'
      guildDataStorage.set(interaction.guildId, cache)
      await interaction.reply({ content: objectionResponse, ephemeral: true })
    }
  } else if (interaction.commandName === 'repo') {
    await interaction.reply({ content: repoResponse, ephemeral: true })
  }
})

CLIENT.on('voiceStateUpdate', async (_oldState, newState) => {
  // await newState.channel.members.fetch();
  if (!enabled) { console.log('disabled'); return };

  const cache = guildDataStorage.get(newState.guild.id)
  let userLeaving = false
  cache.members.forEach(member => { // if user is in the channel already, flag as leaving
    if (member === newState.id) {
      userLeaving = true
      console.log('looks like a leaver')
    }
  })
  if (userLeaving) { // if user is leaving
    const leaverIndex = cache.members.indexOf(newState.id)
    cache.members.splice(leaverIndex, 1)
    if (cache.members.length === 1) {
      leave(newState, cache)
    }
  } else { // if user is not leaving, they have joined
    console.log('looks like a joiner')
    cache.channel = newState.channelId
    cache.members.push(newState.id)
    if (cache.members.length === 1) {
      join(newState, cache)
    }
  }
  console.log(cache.members.length)
}) // when a voice state is updated

CLIENT.login(TOKEN) // login to the client with the token
