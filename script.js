const RSS_FEED_URL = "https://feeds.libsyn.com/494513/rss";
const SPOTIFY_SHOW_URL =
  "https://open.spotify.com/show/1nI3c3wb9c8AM3nR69lkrk?si=U3t4IHy3SdSpH0IDJgbH9Q";
const FEATURED_EPISODE_TITLE =
  "When We Know Better, We Do Better: Building a Future for All Children";
const EPISODE_LIMIT = 6;

const episodeGrid = document.querySelector("#episode-grid");
const archiveSummary = document.querySelector("[data-archive-summary]");
const archiveToggle = document.querySelector("[data-archive-toggle]");
const seasonTabs = document.querySelector("[data-season-tabs]");
const featuredTitle = document.querySelector("[data-featured-title]");
const featuredDescription = document.querySelector("[data-featured-description]");
const featuredPlayer = document.querySelector("[data-featured-player]");
const featuredLink = document.querySelector("[data-featured-link]");
let allEpisodes = [];
let activeFilter = "latest";

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
    allEpisodes = episodes;
    renderArchiveControls(episodes);
    renderEpisodes();
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

function renderArchiveControls(episodes) {
  if (!episodes.length) return;

  const seasons = getSeasons(episodes);

  if (archiveSummary) {
    archiveSummary.textContent = `${episodes.length} recorded conversations across ${seasons.length} seasons.`;
  }

  if (seasonTabs) {
    const fragment = document.createDocumentFragment();
    fragment.append(createSeasonButton("latest", "Latest"));
    fragment.append(createSeasonButton("all", "All Episodes"));

    seasons.forEach((season) => {
      fragment.append(createSeasonButton(season, `Season ${season}`));
    });

    seasonTabs.replaceChildren(fragment);
  }

  if (archiveToggle) {
    archiveToggle.addEventListener("click", () => {
      activeFilter = activeFilter === "all" ? "latest" : "all";
      renderEpisodes();
    });
  }
}

function createSeasonButton(filter, label) {
  const button = document.createElement("button");
  button.className = "season-tab";
  button.type = "button";
  button.dataset.seasonFilter = filter;
  button.textContent = label;
  button.setAttribute("aria-pressed", filter === activeFilter ? "true" : "false");

  button.addEventListener("click", () => {
    activeFilter = filter;
    renderEpisodes();
  });

  return button;
}

function renderEpisodes() {
  if (!allEpisodes.length) return;

  const episodes = getVisibleEpisodes();
  episodeGrid.replaceChildren(...episodes.map(createEpisodeCard));
  updateArchiveState(episodes.length);
}

function getVisibleEpisodes() {
  if (activeFilter === "latest") {
    return allEpisodes.slice(0, EPISODE_LIMIT);
  }

  if (activeFilter === "all") {
    return allEpisodes;
  }

  return allEpisodes.filter((episode) => episode.season === activeFilter);
}

function updateArchiveState(visibleCount) {
  document.querySelectorAll(".season-tab").forEach((button) => {
    const isActive = button.dataset.seasonFilter === activeFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (archiveToggle) {
    archiveToggle.hidden = activeFilter !== "latest" && activeFilter !== "all";
    archiveToggle.textContent = activeFilter === "all" ? "Show latest episodes" : "View all episodes";
  }

  if (archiveSummary) {
    const seasons = getSeasons(allEpisodes);
    const label = activeFilter === "latest"
      ? `${allEpisodes.length} recorded conversations across ${seasons.length} seasons. Showing the latest ${visibleCount}.`
      : `Showing ${visibleCount} recorded conversation${visibleCount === 1 ? "" : "s"}.`;
    archiveSummary.textContent = label;
  }
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

  card.append(meta, title, description);

  if (episode.audioUrl) {
    card.append(audio);
  } else {
    const link = document.createElement("a");
    link.href = SPOTIFY_SHOW_URL;
    link.textContent = "Listen on Spotify";
    link.setAttribute("aria-label", `Listen to ${episode.title} on Spotify`);
    card.append(link);
  }
  return card;
}

function renderFeaturedEpisode(episodes) {
  const featured = episodes.find((episode) => episode.title === FEATURED_EPISODE_TITLE);

  if (!featured) return;

  featuredTitle.textContent = featured.title;
  featuredDescription.textContent = truncateText(featured.description, 230);
  featuredLink.href = SPOTIFY_SHOW_URL;

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

function getSeasons(episodes) {
  return [...new Set(episodes.map((episode) => episode.season).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));
}

loadEpisodes();
