import axios from "axios";
import { JSDOM } from "jsdom";

const privateWorlds = ['astraja', 'asylum', 'ataentsic', 'badzior', 'dionizos', 'dream', 'elizjum', 'ertill', 'febris', 'hades', 'helios', 'hypnos', 'inferno', 'latimar', 'legion', 'lupus', 'majorka', 'mordor', 'narwhals', 'nerthus', 'nexos', 'nubes', 'nyras', 'odysea', 'orchidea', 'orvidia', 'pandora', 'regros', 'riventia', 'stark', 'stoners', 'syberia', 'thantos', 'unia', 'virtus', 'zefira'] as const;

type Proffesion = "b" | "w" | "h" | "t" | "m" | "p";

type Player = {
    nick: string;
    lvl: number;
    proffesion: Proffesion;
    daysOffline: number;
    profileId: number;
};

type World = typeof privateWorlds[number];

type OffCheckerConfig = {
    min: number;
    max: number;
    world: World;
};

const proffesions: { [key: string]: Proffesion } = {
    "Tancerz ostrzy": "b",
    "Wojownik": "w",
    "Łowca": "h",
    "Tropiciel": "t",
    "Mag": "m",
    "Paladyn": "p"
} as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRankingPage = async (page: number, world: World): Promise<Document>  => {
    const URL = `https://www.margonem.pl/ladder/players,${world}?page=${page}`;
    const response = await axios.get(URL);
    if (response.status !== 200) {
        await sleep(100);
        return getRankingPage(page, world);
    };
    const { document } = (new JSDOM(response.data)).window;
    return document;
};

const getMaxPage = async (world: World): Promise<number> => {
    const firstPage = await getRankingPage(1, world);
    const totalPages = firstPage.querySelector(".total-pages a")?.textContent;
    if (!totalPages) {
        await sleep(100);
        return getMaxPage(world);
    }
    return parseInt(totalPages, 10);
}

const getAllPages = async (world: World): Promise<Document[]> => {
    const maxPage = await getMaxPage(world);
    const pages: Document[] = [];
    for (let page = 1; page <= maxPage; page++) {
        pages.push(await getRankingPage(page, world));
    };
    return pages;
}

const parseOfflineDays = (lastOnline: string): number => {
    if (lastOnline === "Mniej niż 24h temu") {
        return 0;
    }
    const days = lastOnline.match(/(\d+)/g);
    if (!days) return 0;
    return parseInt(days[0], 10);
};

const getPlayersFromPage = (page: Document): Player[] => {
    const tableElements = page.querySelectorAll("tbody tr");
    const players: Player[] = [];
    tableElements.forEach((element) => {
        const longClan = element.querySelector(".long-clan a");
        const nick = longClan?.textContent;
        const id = longClan?.getAttribute("href")?.match(/view,(\d+)/)?.[1];
        const lvl = element.querySelector(".long-level")?.textContent;
        const proffesion = element.querySelector(".long-players")?.textContent;
        const daysOffline = element.querySelector(".long-last-online")?.textContent;
        if (!nick || !id || !lvl || !proffesion || !daysOffline) return;
        players.push({
            nick: nick.trim(),
            lvl: parseInt(lvl, 10),
            proffesion: proffesions[proffesion.trim()],
            daysOffline: parseOfflineDays(daysOffline.trim()),
            profileId: parseInt(id, 10)
        });
    });
    return players;
};

const getAllPlayers = async (world: World): Promise<Player[]> => {
    const pages = await getAllPages(world);
    const players: Player[] = [];
    pages.forEach((page) => {
        players.push(...getPlayersFromPage(page));
    });
    return players;
};

const findPlayersInDanger = async (config: OffCheckerConfig): Promise<Player[]> => {
    const { min, max, world } = config;
    const players = await getAllPlayers(world);
    const endangeredPlayers = players.filter((player) => player.daysOffline >= min && player.daysOffline <= max);
    return endangeredPlayers;
}

export default findPlayersInDanger;
export type { Player, World, OffCheckerConfig };