const RSS_FEED_URL = "https://feeds.libsyn.com/494513/rss";
const FEATURED_EPISODE_TITLE =
  "When We Know Better, We Do Better: Building a Future for All Children";
const EPISODE_LIMIT = 6;

const episodeGrid = document.querySelector("#episode-grid");
const featuredTitle = document.querySelector("[data-featured-title]");
const featuredDescription = document.querySelector("[data-featured-description]");
const featuredPlayer = document.querySelector("[data-featured-player]");
const featuredLink = document.querySelector("[data-featured-link]");

async function loadEpisodes() {
  if (!episodeGrid) return;

  try {
    const response = await fetch(RSS_FEED_URL);

    if (!response.ok) {
      throw new Error(`RSS feed request failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");

    if (xml.querySelector("parsererror")) {
      throw new Error("RSS feed could not be parsed.");
    }

    const episodes = [...xml.querySelectorAll("item")].map(parseEpisode);
    renderLatestEpisodes(episodes.slice(0, EPISODE_LIMIT));
    renderFeaturedEpisode(episodes);
  } catch (error) {
    console.warn("Using fallback episode cards because the Libsyn feed could not load.", error);
  }
}

function parseEpisode(item) {
  const title = getText(item, "title");
  const link = getText(item, "link") || RSS_FEED_URL;
  const pubDate = getText(item, "pubDate");
  const episode = getText(item, "itunes\\:episode") || getText(item, "episode");
  const season = getText(item, "itunes\\:season") || getText(item, "season");
  const duration = getText(item, "itunes\\:duration") || getText(item, "duration");
  const description = cleanDescription(
    getText(item, "description") || getText(item, "content\\:encoded")
  );
  const audioUrl = item.querySelector("enclosure")?.getAttribute("url") || "";

  return {
    title,
    link,
    pubDate,
    episode,
    season,
    duration,
    description,
    audioUrl,
  };
}

function renderLatestEpisodes(episodes) {
  if (!episodes.length) return;

  episodeGrid.replaceChildren(...episodes.map(createEpisodeCard));
}

function createEpisodeCard(episode) {
  const card = document.createElement("article");
  card.className = "episode-card";

  const meta = document.createElement("p");
  meta.className = "episode-number";
  meta.textContent = formatEpisodeMeta(episode);

  const title = document.createElement("h3");
  title.textContent = episode.title;

  const description = document.createElement("p");
  description.className = "episode-description";
  description.textContent = truncateText(episode.description, 150);

  const audio = document.createElement("audio");
  audio.className = "episode-audio";
  audio.controls = true;
  audio.preload = "none";
  audio.src = episode.audioUrl;
  audio.setAttribute("aria-label", `Listen to ${episode.title}`);

  const link = document.createElement("a");
  link.href = episode.audioUrl || episode.link || RSS_FEED_URL;
  link.textContent = "Open episode";
  link.setAttribute("aria-label", `Open episode: ${episode.title}`);

  card.append(meta, title, description);

  if (episode.audioUrl) {
    card.append(audio);
  }

  card.append(link);
  return card;
}

function renderFeaturedEpisode(episodes) {
  const featured = episodes.find((episode) => episode.title === FEATURED_EPISODE_TITLE);

  if (!featured) return;

  featuredTitle.textContent = featured.title;
  featuredDescription.textContent = truncateText(featured.description, 230);
  featuredLink.href = featured.audioUrl || featured.link || RSS_FEED_URL;

  if (featured.audioUrl && featuredPlayer) {
    const audio = document.createElement("audio");
    audio.className = "featured-audio";
    audio.controls = true;
    audio.preload = "none";
    audio.src = featured.audioUrl;
    audio.setAttribute("aria-label", `Listen to ${featured.title}`);
    featuredPlayer.replaceChildren(audio);
  }
}

function getText(parent, selector) {
  return parent.querySelector(selector)?.textContent.trim() || "";
}

function cleanDescription(html) {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  return documentFragment.body.textContent.replace(/\s+/g, " ").trim();
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;

  const shortened = text.slice(0, maxLength).trim();
  return `${shortened.replace(/[,\s]+$/, "")}...`;
}

function formatEpisodeMeta(episode) {
  const parts = [];

  if (episode.season) parts.push(`Season ${episode.season}`);
  if (episode.episode) parts.push(`Episode ${episode.episode}`);
  if (episode.duration) parts.push(episode.duration);

  if (!parts.length && episode.pubDate) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(episode.pubDate));
  }

  return parts.join(" / ") || "Latest episode";
}

loadEpisodes();
