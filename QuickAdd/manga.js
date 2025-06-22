// based off of movie & book scripts by Christian B. B. Houmann
// scripts + quickadd documentation: https://github.com/chhoumann/quickadd/
// jikan api documentation: https://docs.api.jikan.moe/
// Version 2

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
        name: "MAL Manga Script Using Jikan API",
    }
};

async function start(params) {
    QuickAdd = params;

    const query = await QuickAdd.quickAddApi.inputPrompt("Enter manga name: ");
    if (!query) {
        notice("No query entered.");
        throw new Error("No query entered.");
    }

    let selectedManga;

    const results = await createQuery(query);

    const choice = await QuickAdd.quickAddApi.suggester(results.map(formatTitleForSuggestion), results);
    if (!choice) {
        notice("No choice selected.");
        throw new Error("No choice selected.");
    }

    selectedManga = choice;

selectedManga = choice;

const safeTitle = selectedManga?.title ?? "Unknown Title";
const mangaYear = extractYear(selectedManga);
const fileName = replaceIllegalFileNameCharactersInString(`${safeTitle} (${mangaYear})`);

QuickAdd.variables = {
    ...selectedManga,
    authorsReversed: fixAuthors(selectedManga.authors),
    genreList: makeList(selectedManga.genres),
    authorsOriginal: quoteYamlValue(getNestedValue(selectedManga.authors)),
    themesList: makeList(selectedManga.themes),
    cover: selectedManga.images.jpg.image_url,
    fileName: fileName,
    title: quoteYamlValue(safeTitle),
    japaneseTitle: quoteYamlValue(selectedManga?.title_japanese ?? "N/A"),
    alternateTitles: makeListString(selectedManga.titles),
    summary: reformatSummary(selectedManga.synopsis),
    chapterNumber: selectedManga?.chapters ?? "0",
    volumeNumber: selectedManga?.volumes ?? "0",
    malURL: quoteYamlValue(selectedManga?.url ?? "N/A"),
    year: mangaYear,
    onlineRating: (selectedManga?.score !== null && selectedManga?.score !== undefined && selectedManga?.score !== "") 
    ? selectedManga.score 
    : "N/A",
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
        .replace(/["()]/g, "")       // remove problem characters
        .replace(/\s+/g, " ")        // collapse all whitespace 
        .trim();

    const maxLength = 300;
    const shortened = cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "…" : cleaned;
    const escaped = shortened.replace(/"/g, "'"); // replace double quotes inside to avoid YAML breaking
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
