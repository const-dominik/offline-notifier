import findPlayersInDanger from "./findOffline";
import { Player, OffCheckerConfig } from "./findOffline";
import { Client, ColorResolvable, MessageEmbed, TextChannel, Intents } from "discord.js";
import http from "http";
import cron from "cron";
const { token } = require('./config.json');

//server
const server = http.createServer((_, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    res.end("hello world!");
});

server.listen(process.env.PORT || 3000, () => {
    console.log("server running");
});

//bot
const Bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        ]
});

Bot.once('ready', () => {
    new cron.CronJob('0 0 0 * * *', sendWarnings);
});

Bot.login(token);

//player-embed generator
const getColor = (step: number): ColorResolvable => {
    const red = Math.round(255 * (1 - step));
    const green = Math.round(255 * step);
    return [red, green, 0] as const;
};

const generateEmbed = (player: Player, { min, max }: OffCheckerConfig) => {
    const step = (max - player.daysOffline)/(max - min);
    const color = getColor(step);
    const embed = new MessageEmbed()
        .setTitle(`${player.nick} (${player.lvl}${player.proffesion})`)
        .setDescription(`Ostatnio online: ${player.daysOffline} dni temu`)
        .setURL(`https://www.margonem.pl/profile/view,${player.profileId}`)
        .setColor(color);
    return embed;
};

const sendWarnings = async () => {
    const config: OffCheckerConfig = {
        min: 12,
        max: 15,
        world: "nyras"
    };
    const players = await findPlayersInDanger(config);
    const embeds = players.map(player => generateEmbed(player, config));
    const channel = Bot.channels.cache.get('629735092365033493') as TextChannel;
    if (channel) {
        embeds.forEach(embed => channel.send({ embeds: [embed] }));
    }
}