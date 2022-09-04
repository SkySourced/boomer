import { Client, GatewayIntentBits, Routes, PermissionFlagsBits, Collection } from "discord.js"; // importing required libraries from discord.js
import { REST } from "@discordjs/rest"; // importing rest library from discord.js
import { SlashCommandBuilder } from "@discordjs/builders"; // importing builder library from discord.js
import { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource } from "@discordjs/voice"; // importing voice library from discord.js
const CLIENT = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] }); // creating a new client
import config from "./config.json" assert {type: 'json'}; // importing config
import token from "./token.json" assert {type: 'json'}; // importing token

// imports from json
const TOKEN = token.token; // token
const CLIENT_ID = config.client_id; // client id
const enableResponse = config.messages.soundEnableResponse; // importing soundEnableResponse from config.json
const disableResponse = config.messages.soundDisableResponse; // importing soundDisableResponse from config.json
const publicResponse = config.messages.soundPublicResponse; // importing soundPublicResponse from config.json
const privateResponse = config.messages.soundPrivateResponse; // importing soundPrivateResponse from config.json
const vineboomPath = config.paths.vineboom; // path to the vineboom sound effect
const objectionPath = config.paths.objection; // path to the objection sound effect

// player def
const vineBoomPlayer = createAudioPlayer();
var resource;

var maxInterval = 20; // max interval between sound effects (mins)

vineBoomPlayer.on('error', error => {
    console.error(error)
})

const rest = new REST({version: '9'}).setToken(TOKEN); // creating a new rest client to sync slash commands

var enabled = true; // if the bot is enabled or not
var activeVoiceChannels = new Collection;
/* activeVoiceChannels structure
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
        .setName("setstatus") // setting the name of the command
        .setDescription("Changes if the bot will play") // setting the description of the command
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages) // setting the minimum permissions of the command
        .addStringOption(botstatus => // adding user input
        botstatus.setName("botstatus") // setting the name of the option
                .setDescription("The functionality of the bot") // setting the description of the option
                .setRequired(true) // setting the option as required
                .addChoices( // adding choices to the option
                    { name: "enabled", value: "enabled" }, // enabled choice
                    { name: "disabled", value: "disabled" } // disabled choice
                )
        ),
    new SlashCommandBuilder() // creating a new command
        .setName("setavailablility") // setting the name of the command
        .setDescription("Changes if setstatus and setsfx are publicly available") // setting the description of the command
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // setting the minimum permissions of the command
        .addStringOption(availability => // adding user input
            availability.setName("availability") // setting the name of the option
                .setDescription("Whether setStatus is publicly available") // setting the description of the option
                .setRequired(true) // setting the option as required
                .addChoices( // adding choices to the option
                    { name: "open the floodgates", value: "public" }, // public choice
                    { name: "return to order", value: "private" } // private choice
                )
        ),
]

async function syncGlobalSlashCommands() {
    // sync commands with discord
    try {
        console.log("Beginning to refresh global slash commands")
        await rest.put( // push to discord
            Routes.applicationCommands(CLIENT_ID),
            {body: commands}
        )
        console.log("Successfully refreshed global slash commands")
    } catch (error) {
        console.error(error)
    }
}

async function syncSlashCommands(guildId){
    // sync commands with discord
    try {
        console.log("Beginning to refresh slash commands")
        await rest.put( // push to discord
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            {body: commands}
        )
        console.log("Successfully refreshed slash commands")
    } catch (error) {
        console.error(error)
    }
}

function playVineBoom(){
    //resource = createAudioResource(vineboomPath) // create audio resource (vineboom)
    resource = createAudioResource(objectionPath) // create audio resource (objection)
    player.play(resource) // play the audio
    setTimeout(resetVineBoom, 4000) // the sound effect is around 3 seconds long so this prevents the bot from playing the sound effect too frequently
}

function resetVineBoom(){
    player.stop(resource) // stop the audio (in case it hasn't finished playing (probably not necessary))
    var interval = Math.ceil(Math.random() * maxInterval * 60000) // random interval between 0 and 1200 seconds (20 mins)
    //console.log("Next sfx in " + interval + " seconds")
    setTimeout(playVineBoom, interval) // play the sound effect again after a random amount of time
}

function join(voiceState, cache){
    var connection = joinVoiceChannel({
        channelId: voiceState.channelId,
        guildId: voiceState.guild.id,
        adapterCreator: voiceState.guild.voiceAdapterCreator
    })
    connection.subscribe(player);
    activeVoiceChannels.set(voiceState.guild.id, cache)
    //console.log('joined channel ' + voiceState.channel.name + ' in ' + voiceState.guild.name);
}

function leave(voiceState, cache){
    console.log("leaving");
    var connection = getVoiceConnection(voiceState.guild.id)
    if(connection) connection.destroy();
    cache.channel = null;
    activeVoiceChannels.set(voiceState.guild.id, cache)
}

CLIENT.on('ready', async () => { // when the client is ready
    await syncGlobalSlashCommands() // sync commands with discord
    console.log(`Logged in as ${CLIENT.user.tag}!`); // log in the console that the client is ready
    playVineBoom()
    for(let i = 0; i < CLIENT.guilds.cache.size; i++){
        activeVoiceChannels.set(CLIENT.guilds.cache.keyAt(i), {members: [], channel: null, sfx: "vineboom", availability: "private"});
    } // for each guild the client is in
    console.log("-- Active Voice Channels --");
    console.log(activeVoiceChannels);
})

CLIENT.on('interactionCreate', async interaction => { // when an interaction is created
    if(!interaction.isCommand()) return; // if the interaction is not a slash command, stop

    if(interaction.commandName === 'setstatus') { // if the interaction is the setStatus command
        if(interaction.options.getString('botstatus') === 'enabled') { // if the interaction is enabled
            enabled = true; // set enabled to true
            await interaction.reply({ content: enableResponse, ephemeral: true})
        } else if (interaction.options.getString('botstatus') === 'disabled') { // if the interaction is disabled
            enabled = false; // set enabled to false
            var connection = getVoiceConnection(interaction.guild.id)
            if(connection) connection.destroy();
            let cache = activeVoiceChannels.get(interaction.guild.id);
            cache.channel = null;
            activeVoiceChannels.set(interaction.guildId, cache)
            await interaction.reply({ content: disableResponse, ephemeral: true})
        }
    } else if (interaction.commandName === 'setavailablility') { // if the interaction is the setAvailablility command
        if(interaction.options.getString('availability') === 'public') { // if the interaction is public
            commands[0].setDefaultMemberPermissions(PermissionFlagsBits.SendMessages) // set the minimum permissions to low-level
            await syncSlashCommands(interaction.guildId) // sync commands with discord
            await interaction.reply({ content: publicResponse, ephemeral: true})
        } else if (interaction.options.getString('availability') === 'private') { // if the interaction is private
            commands[0].setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // set the minimum permissions to administrator
            await syncSlashCommands(interaction.guildId) // sync commands with discord
            await interaction.reply({ content: privateResponse, ephemeral: true})
        }
    }
})

CLIENT.on('voiceStateUpdate', async (_oldState, newState) => {
    //await newState.channel.members.fetch();
    if(!enabled){ console.log("disabled"); return };

    let cache = activeVoiceChannels.get(newState.guild.id);
    let userLeaving = false;
    cache.members.forEach(member => { // if user is in the channel already, flag as leaving
        if(member === newState.id){
            userLeaving = true;
            console.log("looks like a leaver");
        }
    });
    if(userLeaving){ // if user is leaving
        console.log("attempting leave");
        let leaverIndex = cache.members.indexOf(newState.id);
        cache.members.splice(leaverIndex, 1);
        if(cache.members.length === 1){
            leave(newState, cache);
        }
    } else { // if user is not leaving, they have joined
        console.log("looks like a joiner");
        cache.channel = newState.channelId;
        cache.members.push(newState.id);
        if(cache.members.length === 1){
            join(newState, cache);
        }
    }
    console.log(cache.members.length);
}); // when a voice state is updated

CLIENT.login(TOKEN); // login to the client with the token