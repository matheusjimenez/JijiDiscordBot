require('dotenv/config');
const Discord = require("discord.js");
const ytdl = require('ytdl-core');

const client = new Discord.Client();


client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const prefix = '>';
const queue = new Map();

client.once("ready", () => {
    console.log("Ready!");
  });
  
  client.once("reconnecting", () => {
    console.log("Reconnecting!");
  });
  
  client.once("disconnect", () => {
    console.log("Disconnect!");
  });

client.on('message', msg => {
    if (msg.author.bot)
        return;

    if (!msg.content.startsWith(prefix))
        return;


    function ignorePrefix(word) {
        return msg.content.startsWith(`${prefix}${word}`)
    }

    const serverQueue = queue.get(msg.guild.id);

    async function execute(message, serverQueue) {
        const args = message.content.split(" ");

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel)
            return message.channel.send(
                "Vc precisa ta num canal pra eu tocar né!"
            );
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "num consigo falar no channel ae!"
            );
        }

        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };

        if (!serverQueue) {

        } else {
            serverQueue.songs.push(song);
            console.log(serverQueue.songs);
            return message.channel.send(`${song.title} musica adicionada na fila!`);
        }

        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 2,
            playing: true,
        };

        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    }

    function play(guild, song) {
        const serverQueue = queue.get(guild.id);
        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on("finish", () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Soltando o batidão: **${song.title}**`);
    }

    function skip(message, serverQueue) {
        if (!message.member.voice.channel)
          return message.channel.send(
            "Vc não está no canal para dar pitaco na musica!"
          );
        if (!serverQueue)
          return message.channel.send("Não tem música pra skippar!");
        serverQueue.connection.dispatcher.end();
      }

      function stop(message, serverQueue) {
        if (!message.member.voice.channel)
          return message.channel.send(
            "Vc não está no canal para dar pitaco na musica!"
          );
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
      }

    //<><<><><><><>commands<><><><><><><><><> 
    if (ignorePrefix('ping')) {
        const timeTaken = Date.now() - msg.createdTimestamp;
        msg.reply(`Pong! a mensagem demorou ${timeTaken}ms.`);
    } else if (ignorePrefix('play')) {
        execute(msg, serverQueue);
        return;
    }
    else if (ignorePrefix('p')) {
        execute(msg, serverQueue);
        return;
    }
    else if (ignorePrefix('skip')) {
        skip(msg, serverQueue);
        return;
    }
    else if (ignorePrefix('stop')) {
        stop(msg, serverQueue);
        return;
    } else {
        msg.channel.send("Comando não válido seu comédia. REINNNSS");
    }
});

