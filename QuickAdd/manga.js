// based off of movie & book scripts by Christian B. B. Houmann
// Version 3 — includes mangastatus prompt

const notice = msg => new Notice(msg, 5000);

const searchResultsLimit = "10";
const API_URL = "https://api.jikan.moe/v4/manga";

function extractYear(manga) {
    const dateStr = manga.published?.from ?? manga.aired?.from;
    if (!dateStr) return "N/A";
    try {
        return new Date(dateStr).getFullYear();
    } catch {
        return "N/A";
    }
}

let QuickAdd;

module.exports = {
    entry: start,
    settings: {
        name: "MAL Manga Script Using Jikan API + Status",
    }
};

async function start(params) {
    QuickAdd = params;

    const query = await QuickAdd.quickAddApi.inputPrompt("Enter manga name:");
    if (!query) {
        notice("No query entered.");
        throw new Error("No query entered.");
    }

    const results = await createQuery(query);
    const choice = await QuickAdd.quickAddApi.suggester(results.map(formatTitleForSuggestion), results);
    if (!choice) {
        notice("No choice selected.");
        throw new Error("No choice selected.");
    }

    // Remove o prompt de status, define o status fixo aqui:
    const fixedStatus = "Planning";

    const safeTitle = choice?.title ?? "Unknown Title";
    const mangaYear = extractYear(choice);
    const fileName = replaceIllegalFileNameCharactersInString(`${safeTitle} (${mangaYear})`);

    QuickAdd.variables = {
        ...choice,
        authorsReversed: fixAuthors(choice.authors),
        genreList: makeList(choice.genres),
        authorsOriginal: quoteYamlValue(getNestedValue(choice.authors)),
        themesList: makeList(choice.themes),
        cover: choice.images.jpg.image_url,
        fileName: fileName,
        title: quoteYamlValue(safeTitle),
        japaneseTitle: quoteYamlValue(choice?.title_japanese ?? "N/A"),
        alternateTitles: makeListString(choice.titles),
        summary: reformatSummary(choice.synopsis),
        chapterNumber: choice?.chapters ?? "0",
        volumeNumber: choice?.volumes ?? "0",
        malURL: quoteYamlValue(choice?.url ?? "N/A"),
        year: mangaYear,
        onlineRating: (choice?.score !== null && choice?.score !== undefined && choice?.score !== "") 
            ? choice.score 
            : "N/A",
        mangastatus: fixedStatus,
    };
}

function formatTitleForSuggestion(resultItem) {
    return `(${resultItem.type}) ${resultItem.title}`;
}

async function createQuery(query) {
    const searchResults = await apiGet(API_URL, { "q": query });
    if (!searchResults.data) {
        notice("No results found.");
        throw new Error("No results found.");
    }
    return searchResults.data;
}

function fixAuthors(authors) {
    const reversedArray = authors.map(author => author.name.split(', ').reverse().join(' '));
    return reversedArray.join(", ");
}

function getNestedValue(sublist) {
    if (!Array.isArray(sublist) || sublist.length === 0) return "N/A";
    if (sublist.length === 1) return sublist[0].name;
    return sublist.map(item => item.name).join(", ");
}

function makeList(array) {
    if (!Array.isArray(array) || array.length === 0) return "N/A";
    return array.map((item) => `\n  - "${item.name}"`).join("");
}

function makeListString(array) {
    if (!Array.isArray(array) || array.length === 0) return "N/A";
    return array.map((item) => `\n - "${item.type}: ${item.title}"`).join("");
}

function reformatSummary(string) {
    if (!string || typeof string !== "string") return `"N/A"`;
    const cleaned = string
        .replace(/["()]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const maxLength = 300;
    const shortened = cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "…" : cleaned;
    const escaped = shortened.replace(/"/g, "'"); // replace internal double quotes
    return `"${escaped}"`;
}

function quoteYamlValue(str) {
    if (!str || typeof str !== "string") return `"N/A"`;
    const cleaned = str.replace(/"/g, '\\"');
    return `"${cleaned}"`;
}

function replaceIllegalFileNameCharactersInString(string) {
    if (!string || typeof string !== "string") return "Untitled";
    return string.replace(/[\\\/:*?"<>|]/g, '');
}

async function apiGet(url, data) {
    let finalURL = new URL(url);
    if (data) {
        Object.keys(data).forEach(key => finalURL.searchParams.append(key, data[key]));
    }
    finalURL.searchParams.append("limit", searchResultsLimit);

    const res = await request({
        url: finalURL.href,
        method: 'GET',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    return JSON.parse(res);
}