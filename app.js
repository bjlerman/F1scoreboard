const STORAGE_KEY = "retro_f1_fantasy_v1";
const MAX_DRIVERS_PER_TEAM = 4;
const ONLINE_SEASON = 2026;
const FULL_SEASON_ROUND_COUNT_2026 = 24;
const CANCELLED_ROUNDS_2026 = new Set([4, 5]);
const DEFAULT_LEAGUE_JSON_PATH = "./f1_fantasy_league_2026.json";
const SCHEDULE_ENDPOINTS_2026 = [
  `https://api.jolpi.ca/ergast/f1/${ONLINE_SEASON}.json`,
  `https://api.jolpi.ca/ergast/f1/${ONLINE_SEASON}/races.json`,
  `https://ergast.com/api/f1/${ONLINE_SEASON}.json`
];
const PRELOADED_2026_RACES = [
  "R01 Australia GP (Melbourne)",
  "R02 China GP (Shanghai)",
  "R03 Japan GP (Suzuka)",
  "R06 Miami GP",
  "R07 Emilia Romagna GP (Imola)",
  "R08 Monaco GP",
  "R09 Spain GP (Madrid)",
  "R10 Canada GP (Montreal)",
  "R11 Austria GP (Spielberg)",
  "R12 Great Britain GP (Silverstone)",
  "R13 Belgium GP (Spa)",
  "R14 Hungary GP (Budapest)",
  "R15 Netherlands GP (Zandvoort)",
  "R16 Italy GP (Monza)",
  "R17 Azerbaijan GP (Baku)",
  "R18 Singapore GP",
  "R19 United States GP (Austin)",
  "R20 Mexico City GP",
  "R21 Sao Paulo GP",
  "R22 Las Vegas GP",
  "R23 Qatar GP",
  "R24 Abu Dhabi GP"
];
const PRELOADED_TEAM_DATA = [
  {
    name: "Kaiser Permanente Department of Billustration Racing Team fueled by Little Debbie",
    drivers: ["Norris", "Hadjar", "Gasly"]
  },
  {
    name: "Friction Labs Mellow Send Outdoor Boulder F1 Team",
    drivers: ["Russell", "Hadjar", "Gasly", "Ocon"]
  },
  {
    name: "The Nano Banana Pro Racing Copyright Violations presented by Ask Jeeves",
    drivers: ["Russell", "Antonelli", "Albon", "Ocon"]
  },
  {
    name: "Scuderia Alberto Ooni Pro-Pizza Racing",
    drivers: ["Leclerc", "Antonelli", "Lawson", "Bearman"]
  },
  {
    name: "Maxwell House Espresso Martini F1 Team",
    drivers: ["Norris", "Hamilton", "Sainz", "Bottas"]
  },
  {
    name: "The Bad Boy Racing Mowers an experiment in Motorsport powered by Clippy AI",
    drivers: ["Verstappen", "Hamilton", "Albon", "Alonso"]
  },
  {
    name: "Entertainment 720 Benjamin Lerman CHEEZ-IT F1 Team",
    drivers: ["Verstappen", "Piastri", "Sainz", "Bearman"]
  },
  {
    name: "Scuderia Visa Cash App Yoga Pants",
    drivers: ["Leclerc", "Piastri", "Colapinto", "Hulkenberg"]
  }
];
const DRAFT_TEAM_ORDER = [
  "Kaiser Permanente Department of Billustration Racing Team fueled by Little Debbie",
  "Friction Labs Mellow Send Outdoor Boulder F1 Team",
  "The Nano Banana Pro Racing Copyright Violations presented by Ask Jeeves",
  "Scuderia Alberto Ooni Pro-Pizza Racing",
  "Maxwell House Espresso Martini F1 Team",
  "The Bad Boy Racing Mowers an experiment in Motorsport powered by Clippy AI",
  "Entertainment 720 Benjamin Lerman CHEEZ-IT F1 Team",
  "Scuderia Visa Cash App Yoga Pants"
];

const state = {
  teams: [],
  races: [],
  scheduleSynced: false
};
const PAGE_KEYS = ["scoreboard", "league-roster", "race-results", "season-summary"];
const TEAM_COLORS = [
  "#ff5e5e",
  "#50d6ff",
  "#57ff9a",
  "#ffdc58",
  "#ff66cc",
  "#8ad1ff",
  "#ffa769",
  "#a9ff57",
  "#ffd1ff",
  "#8dffd9"
];
const TEAM_LOGO_FILES = {
  kaiserpermanentedepartmentofbillustrationracingteamfueledbylittledebbie: "./TeamLogos/kaiser_billustration_racing_logo.svg",
  frictionlabsmellowsendoutdoorboulderf1team: "./TeamLogos/friction_labs_mellow_send_logo.svg",
  thenanobananaproracingcopyrightviolationspresentedbyaskjeeves: "./TeamLogos/nano_banana_pro_racing_logo.svg",
  scuderiaalbertooonipropizzaracing: "./TeamLogos/scuderia_alberto_ooni_logo.svg",
  maxwellhouseespressomartinif1team: "./TeamLogos/maxwell_house_espresso_martini_f1_logo.svg",
  thebadboyracingmowersanexperimentinmotorsportpoweredbyclippyai: "./TeamLogos/bad_boy_racing_mowers_clippy_logo.svg",
  entertainment720benjaminlermancheezitf1team: "./TeamLogos/entertainment_720_cheezit_f1_logo.svg",
  scuderiavisacashappyogapants: "./TeamLogos/scuderia_visa_cash_app_yoga_pants_logo.svg"
};

const els = {
  teamForm: document.getElementById("team-form"),
  teamName: document.getElementById("team-name"),
  driverForm: document.getElementById("driver-form"),
  driverTeam: document.getElementById("driver-team"),
  driverName: document.getElementById("driver-name"),
  teamsWrap: document.getElementById("teams-wrap"),
  teamCardTemplate: document.getElementById("team-card-template"),
  raceForm: document.getElementById("race-form"),
  raceName: document.getElementById("race-name"),
  raceControls: document.getElementById("race-controls"),
  pullRaceSelect: document.getElementById("pull-race-select"),
  pullResultsBtn: document.getElementById("pull-results-btn"),
  pullStatus: document.getElementById("pull-status"),
  raceEntry: document.getElementById("race-entry"),
  megaBoard: document.getElementById("mega-board"),
  scoreboardWrap: document.getElementById("scoreboard-wrap"),
  seasonSummaryWrap: document.getElementById("season-summary-wrap"),
  pagePanels: [...document.querySelectorAll(".page-panel")],
  bannerButtons: [...document.querySelectorAll(".banner-btn")],
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  resetBtn: document.getElementById("reset-btn")
};

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function logoEntries() {
  return Object.entries(TEAM_LOGO_FILES);
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function teamLogoPath(teamName) {
  const key = normalizeName(teamName);
  if (TEAM_LOGO_FILES[key]) return TEAM_LOGO_FILES[key];

  // Fallback: find best filename match by overlapping tokens.
  const tokens = String(teamName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
  let best = null;

  logoEntries().forEach(([logoKey, path]) => {
    let score = 0;
    tokens.forEach((token) => {
      if (logoKey.includes(token)) score += token.length;
    });
    if (!best || score > best.score) best = { path, score };
  });

  if (best && best.score >= 8) return best.path;
  return null;
}

function ensureLogoLightbox() {
  let box = document.getElementById("logo-lightbox");
  if (box) return box;

  box = document.createElement("div");
  box.id = "logo-lightbox";
  box.className = "logo-lightbox";
  box.hidden = true;
  box.innerHTML = `
    <div class="logo-lightbox-backdrop" data-close="1"></div>
    <div class="logo-lightbox-panel" role="dialog" aria-modal="true" aria-label="Enlarged team logo">
      <h3 class="logo-lightbox-title">Drivers of the Day</h3>
      <button type="button" class="logo-lightbox-close" data-close="1" aria-label="Close logo preview">Close</button>
      <img class="logo-lightbox-img" alt="" />
    </div>
  `;
  box.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "1") box.hidden = true;
  });
  document.body.append(box);
  return box;
}

function openLogoLightbox(src, altText) {
  const box = ensureLogoLightbox();
  const img = box.querySelector(".logo-lightbox-img");
  const title = box.querySelector(".logo-lightbox-title");
  if (!img) return;
  if (title) title.textContent = "Drivers of the Day";
  img.src = src;
  img.alt = altText || "Team logo";
  box.hidden = false;
}

function openDriversOfDayDefaultExpanded() {
  const winnerBtn = document.querySelector(".winner-logo-btn");
  const winnerImg = winnerBtn?.querySelector(".winner-logo-thumb");
  if (!winnerImg?.src) return;
  openLogoLightbox(winnerImg.src, winnerImg.alt || "Drivers of the Day logo");
}

function roundFromRaceName(name) {
  const match = String(name || "").match(/^R(\d{1,2})\b/i);
  if (!match) return null;
  return Number(match[1]);
}

function isCancelledRound(round) {
  return Number.isInteger(round) && CANCELLED_ROUNDS_2026.has(round);
}

function removeCancelledRaces(list) {
  const races = Array.isArray(list) ? list : [];
  const rounds = new Set(races.map((race) => roundFromRaceName(race?.name)).filter((round) => Number.isInteger(round)));
  if (rounds.size < FULL_SEASON_ROUND_COUNT_2026) return races;
  return races.filter((race) => {
    const round = roundFromRaceName(race?.name);
    return !isCancelledRound(round);
  });
}

function removeCancelledScheduleRows(list) {
  const rows = Array.isArray(list) ? list : [];
  const rounds = new Set(rows.map((row) => Number(row?.round)).filter((round) => Number.isInteger(round)));
  if (rounds.size < FULL_SEASON_ROUND_COUNT_2026) return rows;
  return rows.filter((row) => !isCancelledRound(Number(row?.round)));
}

function raceByRound(round) {
  return state.races.find((race) => roundFromRaceName(race.name) === Number(round)) || null;
}

function setPullStatus(message, tone = "") {
  if (!els.pullStatus) return;
  els.pullStatus.textContent = message || "";
  els.pullStatus.classList.remove("error", "ok");
  if (tone === "error") els.pullStatus.classList.add("error");
  if (tone === "ok") els.pullStatus.classList.add("ok");
}

async function fetchJsonWithFallback(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      return await response.json();
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  throw new Error("Unable to fetch JSON from configured endpoints.");
}

function toScheduleName(round, raceName, locality) {
  const roundLabel = `R${String(round).padStart(2, "0")}`;
  const place = locality ? ` (${locality})` : "";
  return `${roundLabel} ${raceName}${place}`;
}

function parseSchedulePayload(payload) {
  const races = payload?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) return [];

  return races
    .map((race) => {
      const round = Number(race.round);
      if (!Number.isInteger(round)) return null;
      const raceName = race.raceName || `Round ${round}`;
      const locality = race?.Circuit?.Location?.locality || "";
      return {
        round,
        name: toScheduleName(round, raceName, locality)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.round - b.round);
}

function mergeScheduleIntoState(scheduleRows) {
  const activeScheduleRows = removeCancelledScheduleRows(scheduleRows);
  if (!activeScheduleRows.length) return;

  const existingByRound = new Map(
    state.races.map((race) => [roundFromRaceName(race.name), race]).filter(([round]) => round !== null)
  );

  state.races = activeScheduleRows.map((row) => {
    const existing = existingByRound.get(row.round);
    return {
      id: existing?.id || uid("race"),
      name: row.name,
      results: existing?.results || {}
    };
  });
}

function allDrivers() {
  return state.teams.flatMap((team) =>
    team.drivers.map((driver) => ({
      ...driver,
      teamId: team.id,
      teamName: team.name
    }))
  );
}

function uniqueRaceDrivers() {
  return [...new Set(allDrivers().map((d) => d.name))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function normalizeRaceResultsToDriverNames() {
  const idToName = new Map(allDrivers().map((d) => [d.id, d.name]));
  const validNames = new Set(uniqueRaceDrivers());

  state.races.forEach((race) => {
    const oldResults = race.results || {};
    const normalized = {};

    Object.entries(oldResults).forEach(([key, value]) => {
      let driverName = null;
      if (validNames.has(key)) {
        driverName = key;
      } else if (idToName.has(key)) {
        driverName = idToName.get(key);
      }
      if (!driverName) return;
      if (normalized[driverName] === undefined) {
        normalized[driverName] = value;
      }
    });

    race.results = normalized;
  });
}

function pointsForFinish(value) {
  if (value === "DNF" || value === "DNS") return 0;
  const pos = Number(value);
  if (!Number.isInteger(pos) || pos < 1 || pos > 22) return 0;
  return 23 - pos;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizePageKey(value) {
  const key = String(value || "").trim().toLowerCase();
  if (PAGE_KEYS.includes(key)) return key;
  return "scoreboard";
}

function pageKeyFromHash() {
  const raw = String(window.location.hash || "").replace(/^#/, "");
  return normalizePageKey(raw);
}

function activatePage(pageKey, updateHash = true) {
  const nextKey = normalizePageKey(pageKey);
  els.pagePanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.page === nextKey);
  });
  els.bannerButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === nextKey);
  });
  if (updateHash && window.location.hash !== `#${nextKey}`) {
    window.location.hash = nextKey;
  }
  if (nextKey === "league-roster") {
    openDriversOfDayDefaultExpanded();
  }
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.teams) && Array.isArray(parsed.races)) {
      state.teams = parsed.teams;
      state.races = removeCancelledRaces(parsed.races);
    }
  } catch (_err) {
    // ignore corrupted storage and start fresh
  }
}

function initDefaultRaces() {
  const existingByRound = new Map(
    state.races
      .map((race) => [roundFromRaceName(race.name), race])
      .filter(([round]) => Number.isInteger(round))
  );

  state.races = PRELOADED_2026_RACES.map((name) => {
    const round = roundFromRaceName(name);
    const existing = Number.isInteger(round) ? existingByRound.get(round) : null;
    return {
      id: existing?.id || uid("race"),
      name,
      results: existing?.results || {}
    };
  });
}

function ensurePreloadedTeams() {
  const existingByName = new Map(
    state.teams.map((t) => [t.name.toLowerCase(), t])
  );

  PRELOADED_TEAM_DATA.forEach((entry) => {
    const key = entry.name.toLowerCase();
    let team = existingByName.get(key);

    if (!team) {
      team = {
        id: uid("team"),
        name: entry.name,
        drivers: []
      };
      state.teams.push(team);
      existingByName.set(key, team);
    }

    const existingDriverNames = new Set(
      team.drivers.map((d) => d.name.toLowerCase())
    );

    entry.drivers.forEach((driverName) => {
      if (!driverName) return;
      if (team.drivers.length >= MAX_DRIVERS_PER_TEAM) return;
      if (existingDriverNames.has(driverName.toLowerCase())) return;
      team.drivers.push({ id: uid("driver"), name: driverName });
      existingDriverNames.add(driverName.toLowerCase());
    });
  });
}

function lastRaceWithResults() {
  for (let i = state.races.length - 1; i >= 0; i -= 1) {
    const race = state.races[i];
    if (race?.results && Object.keys(race.results).length) return race;
  }
  return null;
}

function finishBadgeColor(result) {
  if (result === "DNF" || result === "DNS") return "#000000";

  const pos = Number(result);
  if (!Number.isInteger(pos) || pos < 1 || pos > 22) return "#2a2f39";

  const t = (pos - 1) / 21;
  const hue = 120 - (120 * t);
  const lightness = 52 - (22 * t);
  return `hsl(${hue} 90% ${lightness}%)`;
}

function averageFinishForDriver(driverName) {
  let total = 0;
  let count = 0;

  state.races.forEach((race) => {
    if (!race?.results) return;
    const value = race.results[driverName];
    if (value === undefined || value === "") return;

    if (value === "DNF" || value === "DNS") {
      total += 23;
      count += 1;
      return;
    }

    const pos = Number(value);
    if (!Number.isInteger(pos) || pos < 1 || pos > 22) return;
    total += pos;
    count += 1;
  });

  if (!count) return "--";
  return (total / count).toFixed(1);
}

function averageFinishNumberForDriver(driverName) {
  const value = averageFinishForDriver(driverName);
  if (value === "--") return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function teamPointsForRace(team, race) {
  if (!race?.results) return 0;
  return team.drivers.reduce((sum, driver) => {
    return sum + pointsForFinish(race.results[driver.name]);
  }, 0);
}

function draftPickForTeamDriver(teamName, driverIndex) {
  const normalizedTeamName = normalizeName(teamName);
  let teamIndex = DRAFT_TEAM_ORDER.findIndex(
    (name) => normalizeName(name) === normalizedTeamName
  );
  if (teamIndex < 0) {
    teamIndex = state.teams.findIndex((team) => normalizeName(team.name) === normalizedTeamName);
  }
  if (teamIndex < 0) return null;

  const round = driverIndex + 1;
  if (round < 1 || round > 4) return null;
  const base = (round - 1) * 8;
  if (round % 2 === 1) {
    return base + teamIndex + 1;
  }
  return base + (8 - teamIndex);
}

function expectedFinishForDraftPick(draftPick) {
  if (!Number.isInteger(draftPick) || draftPick < 1 || draftPick > 32) return null;
  if (draftPick === 1) return 1;
  if (draftPick === 32) return 22;
  // Map 1..32 draft picks onto the 1..22 finish scale.
  return 1 + ((draftPick - 1) * 21) / 31;
}

function draftValueForDriver(teamName, driverIndex, driverName) {
  const avgFinishText = averageFinishForDriver(driverName);
  const avgFinishNumber = averageFinishNumberForDriver(driverName);
  const draftPick = draftPickForTeamDriver(teamName, driverIndex);
  const expectedFinish = expectedFinishForDraftPick(draftPick);
  const value =
    avgFinishNumber !== null && expectedFinish !== null
      ? avgFinishNumber - expectedFinish
      : null;

  return {
    avgFinishText,
    draftPick,
    expectedFinish,
    value
  };
}

function draftValueClass(value) {
  if (value === null) return "dv-na";
  if (Math.abs(value) <= 1.5) return "dv-mid";
  if (value < 0) return "dv-good";
  return "dv-bad";
}

function computeDraftInsights() {
  let bestPick = null;
  let worstPick = null;
  const teamTotals = [];

  state.teams.forEach((team) => {
    let sum = 0;
    let count = 0;

    team.drivers.forEach((driver, idx) => {
      const dv = draftValueForDriver(team.name, idx, driver.name);
      if (dv.value === null) return;

      const entry = {
        teamName: team.name,
        driverName: driver.name,
        value: dv.value
      };

      if (!bestPick || entry.value < bestPick.value) bestPick = entry;
      if (!worstPick || entry.value > worstPick.value) worstPick = entry;

      sum += dv.value;
      count += 1;
    });

    if (count > 0) {
      teamTotals.push({ teamName: team.name, value: sum });
    }
  });

  teamTotals.sort((a, b) => a.value - b.value || a.teamName.localeCompare(b.teamName));
  const bestDrafter = teamTotals.length ? teamTotals[0] : null;
  const worstDrafter = teamTotals.length ? teamTotals[teamTotals.length - 1] : null;

  return { bestPick, worstPick, bestDrafter, worstDrafter };
}

function renderTeamSelect() {
  els.driverTeam.innerHTML = "";
  if (!state.teams.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Add a team first";
    els.driverTeam.append(opt);
    els.driverTeam.disabled = true;
    return;
  }
  els.driverTeam.disabled = false;
  state.teams.forEach((team) => {
    const opt = document.createElement("option");
    opt.value = team.id;
    opt.textContent = team.name;
    els.driverTeam.append(opt);
  });
}

function renderTeams() {
  els.teamsWrap.innerHTML = "";

  if (!state.teams.length) {
    els.teamsWrap.innerHTML = '<p class="empty">No teams yet. Add your first team.</p>';
    return;
  }

  const lastRace = lastRaceWithResults();
  const lastRaceLabel = lastRace ? lastRace.name : "No race results yet";
  const totalDrivers = state.teams.reduce((count, t) => count + t.drivers.length, 0);
  const summary = document.createElement("section");
  summary.className = "roster-summary";
  summary.innerHTML = `
    <div class="summary-block"><span>Teams</span><strong>${state.teams.length}</strong></div>
    <div class="summary-block"><span>Drivers</span><strong>${totalDrivers}</strong></div>
    <div class="summary-block summary-race"><span>Last Race</span><strong>${lastRaceLabel}</strong></div>
  `;
  els.teamsWrap.append(summary);

  const sortedTeams = [...state.teams].sort((a, b) => {
    const aPoints = teamPointsForRace(a, lastRace);
    const bPoints = teamPointsForRace(b, lastRace);
    return bPoints - aPoints || a.name.localeCompare(b.name);
  });

  const winner = lastRace ? sortedTeams[0] || null : null;
  const winnerLogo = winner ? teamLogoPath(winner.name) : null;
  const winnerCard = document.createElement("article");
  winnerCard.className = "roster-card winner-card";
  winnerCard.innerHTML = `
    <header class="roster-head">
      <h3 class="roster-team-name">Drivers of the Day</h3>
      <div class="roster-points">
        <span>Week Winner</span>
        <strong>${winner && lastRace ? teamPointsForRace(winner, lastRace) : 0} pts</strong>
      </div>
    </header>
    <div class="winner-logo-wrap">
      ${
        winnerLogo
          ? `<button type="button" class="winner-logo-btn" aria-label="Enlarge ${winner.name} logo"><img src="${winnerLogo}" alt="${winner.name} logo" class="winner-logo-thumb" /></button>`
          : '<div class="winner-logo-missing">No logo found</div>'
      }
      <p class="winner-team-name">${winner?.name || "No winner yet"}</p>
    </div>
  `;
  const winnerBtn = winnerCard.querySelector(".winner-logo-btn");
  if (winnerBtn && winnerLogo && winner) {
    winnerBtn.addEventListener("click", () => openLogoLightbox(winnerLogo, `${winner.name} logo`));
  }
  els.teamsWrap.append(winnerCard);

  sortedTeams.forEach((team) => {
    const card = document.createElement("article");
    card.className = "roster-card";

    const racePoints = teamPointsForRace(team, lastRace);
    const header = document.createElement("header");
    header.className = "roster-head";
    header.innerHTML = `
      <h3 class="roster-team-name">${team.name}</h3>
      <div class="roster-points">
        <span>Last Race</span>
        <strong>${lastRace ? racePoints : 0} pts</strong>
      </div>
    `;
    card.append(header);

    const list = document.createElement("ul");
    list.className = "roster-driver-list";

    if (!team.drivers.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No drivers yet";
      list.append(empty);
    } else {
      team.drivers.forEach((driver, index) => {
        const lastResult = lastRace?.results?.[driver.name] ?? "--";
        const badgeColor = finishBadgeColor(lastResult);
        const draftValueInfo = draftValueForDriver(team.name, index, driver.name);

        const row = document.createElement("li");
        row.className = "roster-driver-row";

        const order = document.createElement("span");
        order.className = "roster-pos";
        order.textContent = String(index + 1);

        const name = document.createElement("span");
        name.className = "roster-driver-name";
        name.textContent = driver.name;

        const finishBadge = document.createElement("span");
        finishBadge.className = "finish-badge";
        finishBadge.textContent = String(lastResult);
        finishBadge.style.background = badgeColor;

        const avg = document.createElement("span");
        avg.className = "driver-avg";
        avg.textContent = `AVG ${draftValueInfo.avgFinishText}`;

        const draftValueSlot = document.createElement("span");
        draftValueSlot.className = `draft-value ${draftValueClass(draftValueInfo.value)}`;
        if (draftValueInfo.value === null) {
          draftValueSlot.textContent = "DV --";
        } else {
          const sign = draftValueInfo.value > 0 ? "+" : "";
          draftValueSlot.textContent = `DV ${sign}${draftValueInfo.value.toFixed(1)}`;
        }
        if (draftValueInfo.draftPick !== null) {
          const expText =
            draftValueInfo.expectedFinish !== null
              ? draftValueInfo.expectedFinish.toFixed(1)
              : "--";
          draftValueSlot.title = `Pick ${draftValueInfo.draftPick} (exp ${expText}) vs avg finish ${draftValueInfo.avgFinishText}`;
        }

        row.append(order, name, finishBadge, avg, draftValueSlot);
        list.append(row);
      });
    }

    card.append(list);
    els.teamsWrap.append(card);
  });

  const insights = computeDraftInsights();
  const ninthCard = document.createElement("article");
  ninthCard.className = "roster-card roster-insights";

  function formatInsight(entry) {
    if (!entry) return "--";
    const sign = entry.value > 0 ? "+" : "";
    return `${entry.driverName} (${entry.teamName}) ${sign}${entry.value.toFixed(1)}`;
  }

  function formatDrafter(entry) {
    if (!entry) return "--";
    const sign = entry.value > 0 ? "+" : "";
    return `${entry.teamName} ${sign}${entry.value.toFixed(1)}`;
  }

  ninthCard.innerHTML = `
    <header class="roster-head">
      <h3 class="roster-team-name">Draft Insights</h3>
    </header>
    <ul class="insight-list">
      <li class="insight-good"><span>Best Pick</span><strong>${formatInsight(insights.bestPick)}</strong></li>
      <li class="insight-bad"><span>Worst Pick</span><strong>${formatInsight(insights.worstPick)}</strong></li>
      <li class="insight-good"><span>Best Drafter</span><strong>${formatDrafter(insights.bestDrafter)}</strong></li>
      <li class="insight-bad"><span>Worst Drafter</span><strong>${formatDrafter(insights.worstDrafter)}</strong></li>
    </ul>
  `;

  els.teamsWrap.append(ninthCard);
}

function renderRaceControls() {
  const previousValue = document.getElementById("race-select")?.value || "";
  els.raceControls.innerHTML = "";
  if (!state.races.length) {
    els.raceControls.innerHTML = '<p class="empty">Create a race to enter results.</p>';
    return;
  }

  const raceSelect = document.createElement("select");
  raceSelect.id = "race-select";
  state.races.forEach((race) => {
    const opt = document.createElement("option");
    opt.value = race.id;
    opt.textContent = race.name;
    raceSelect.append(opt);
  });

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save Results";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "danger";
  clearBtn.textContent = "Clear Race Results";

  raceSelect.addEventListener("change", () => {
    const round = roundFromRaceName(currentRace()?.name);
    if (els.pullRaceSelect && Number.isInteger(round)) {
      els.pullRaceSelect.value = String(round);
    }
    renderRaceEntry();
  });
  saveBtn.addEventListener("click", saveRaceResultsFromForm);
  clearBtn.addEventListener("click", () => {
    const race = currentRace();
    if (!race) return;
    if (!confirm(`Clear all entered results for ${race.name}?`)) return;
    race.results = {};
    save();
    renderAll();
  });

  if (previousValue && state.races.some((r) => r.id === previousValue)) {
    raceSelect.value = previousValue;
  }

  els.raceControls.append(raceSelect, saveBtn, clearBtn);
}

function renderPullRaceSelect() {
  if (!els.pullRaceSelect) return;
  const previousRound = Number(els.pullRaceSelect.value) || null;

  els.pullRaceSelect.innerHTML = "";
  state.races.forEach((race) => {
    const round = roundFromRaceName(race.name);
    if (!Number.isInteger(round)) return;
    const option = document.createElement("option");
    option.value = String(round);
    option.textContent = race.name;
    els.pullRaceSelect.append(option);
  });

  if (
    previousRound &&
    [...els.pullRaceSelect.options].some((opt) => Number(opt.value) === previousRound)
  ) {
    els.pullRaceSelect.value = String(previousRound);
  }

  els.pullRaceSelect.disabled = !state.races.length;
}

function currentRace() {
  const select = document.getElementById("race-select");
  if (!select) return null;
  return state.races.find((r) => r.id === select.value) || null;
}

function renderRaceEntry() {
  els.raceEntry.innerHTML = "";
  const race = currentRace();
  const drivers = uniqueRaceDrivers();

  if (!race) {
    els.raceEntry.innerHTML = '<p class="empty">No race selected.</p>';
    return;
  }

  if (!drivers.length) {
    els.raceEntry.innerHTML = '<p class="empty">Add teams and drivers before entering race results.</p>';
    return;
  }

  const table = document.createElement("table");
  table.className = "race-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Driver</th>
        <th>Finish</th>
        <th>Race Pts</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  drivers.forEach((driverName) => {
    const tr = document.createElement("tr");
    const finishValue = (race.results && race.results[driverName]) || "";

    const select = document.createElement("select");
    select.dataset.driverName = driverName;

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "--";
    select.append(blank);

    for (let i = 1; i <= 22; i += 1) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      select.append(opt);
    }

    const dnf = document.createElement("option");
    dnf.value = "DNF";
    dnf.textContent = "DNF";
    select.append(dnf);

    const dns = document.createElement("option");
    dns.value = "DNS";
    dns.textContent = "DNS";
    select.append(dns);

    select.value = String(finishValue);

    const pointsCell = document.createElement("td");
    pointsCell.textContent = String(pointsForFinish(select.value));

    select.addEventListener("change", () => {
      pointsCell.textContent = String(pointsForFinish(select.value));
    });

    tr.innerHTML = `<td>${driverName}</td>`;
    const finishCell = document.createElement("td");
    finishCell.append(select);
    tr.append(finishCell, pointsCell);
    tbody.append(tr);
  });

  els.raceEntry.append(table);
}

function saveRaceResultsFromForm() {
  const race = currentRace();
  if (!race) return;

  const selects = els.raceEntry.querySelectorAll("select[data-driver-name]");
  const results = {};
  const usedPositions = new Set();

  for (const select of selects) {
    const driverName = select.dataset.driverName;
    const value = select.value;

    if (!value) {
      alert("Every driver must have a finish position (1-22), DNF, or DNS.");
      return;
    }

    if (value !== "DNF" && value !== "DNS") {
      if (usedPositions.has(value)) {
        alert(`Duplicate finish position detected: ${value}. Each finishing position must be unique.`);
        return;
      }
      usedPositions.add(value);
      results[driverName] = Number(value);
    } else {
      results[driverName] = value;
    }
  }

  race.results = results;
  save();
  renderAll();
}

function parseRaceResultsPayload(payload) {
  const races = payload?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races) || !races.length) return [];
  const race = races[0];
  if (!Array.isArray(race.Results)) return [];
  return race.Results;
}

function matchApiDriverToLeagueName(resultRow, leagueNames) {
  const driver = resultRow?.Driver || {};
  const code = resultRow?.Driver?.code || "";
  const givenName = driver.givenName || "";
  const familyName = driver.familyName || "";
  const candidates = [
    familyName,
    `${givenName} ${familyName}`.trim(),
    code
  ];

  const lookup = new Map(leagueNames.map((name) => [normalizeName(name), name]));
  for (const candidate of candidates) {
    const mapped = lookup.get(normalizeName(candidate));
    if (mapped) return mapped;
  }
  return null;
}

function resultValueFromApi(resultRow) {
  const asNumber = Number(resultRow?.position);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 22) {
    return asNumber;
  }
  const statusText = String(resultRow?.status || "").toLowerCase();
  if (statusText.includes("did not start") || statusText === "dns") {
    return "DNS";
  }
  return "DNF";
}

async function pull2026Schedule() {
  const payload = await fetchJsonWithFallback(SCHEDULE_ENDPOINTS_2026);
  const scheduleRows = parseSchedulePayload(payload);
  if (!scheduleRows.length) {
    throw new Error("Schedule endpoint returned no race rows.");
  }
  mergeScheduleIntoState(scheduleRows);
  state.scheduleSynced = true;
}

async function pullOnlineRaceResults() {
  if (!els.pullRaceSelect || !els.pullRaceSelect.value) {
    setPullStatus("Choose a race first.", "error");
    return;
  }

  const round = Number(els.pullRaceSelect.value);
  if (!Number.isInteger(round) || round < 1) {
    setPullStatus("Invalid round selected.", "error");
    return;
  }

  const race = raceByRound(round);
  if (!race) {
    setPullStatus(`Round ${round} is not available in the 2026 schedule.`, "error");
    return;
  }

  const resultsEndpoints = [
    `https://api.jolpi.ca/ergast/f1/${ONLINE_SEASON}/${round}/results.json`,
    `https://api.jolpi.ca/ergast/f1/${ONLINE_SEASON}/${round}/results`,
    `https://ergast.com/api/f1/${ONLINE_SEASON}/${round}/results.json`
  ];

  setPullStatus(`Pulling ${ONLINE_SEASON} round ${round} results...`);
  if (els.pullResultsBtn) els.pullResultsBtn.disabled = true;

  try {
    const payload = await fetchJsonWithFallback(resultsEndpoints);
    const apiRows = parseRaceResultsPayload(payload);
    if (!apiRows.length) {
      setPullStatus(`No published results yet for ${ONLINE_SEASON} round ${round}.`, "error");
      return;
    }

    const leagueNames = uniqueRaceDrivers();
    const mergedResults = Object.fromEntries(leagueNames.map((name) => [name, "DNF"]));
    let matched = 0;

    apiRows.forEach((row) => {
      const leagueName = matchApiDriverToLeagueName(row, leagueNames);
      if (!leagueName) return;
      mergedResults[leagueName] = resultValueFromApi(row);
      matched += 1;
    });

    race.results = mergedResults;
    save();
    renderAll();

    const raceSelect = document.getElementById("race-select");
    if (raceSelect) {
      raceSelect.value = race.id;
      renderRaceEntry();
    }

    setPullStatus(
      `Loaded ${ONLINE_SEASON} round ${round}. Matched ${matched}/${leagueNames.length} league drivers.`,
      "ok"
    );
  } catch (_err) {
    setPullStatus(
      `Could not fetch ${ONLINE_SEASON} round ${round} from online endpoints.`,
      "error"
    );
  } finally {
    if (els.pullResultsBtn) els.pullResultsBtn.disabled = false;
  }
}

function computeScoreboard() {
  const board = state.teams.map((team) => {
    const driverNames = team.drivers.map((d) => d.name);
    let points = 0;
    state.races.forEach((race) => {
      if (!race.results) return;
      driverNames.forEach((driverName) => {
        points += pointsForFinish(race.results[driverName]);
      });
    });

    return {
      teamId: team.id,
      teamName: team.name,
      points,
      drivers: team.drivers.length
    };
  });

  board.sort((a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName));
  return board;
}

function renderScoreboard() {
  const board = computeScoreboard();
  renderMegaBoard(board);
  if (!board.length) {
    els.scoreboardWrap.innerHTML = '<p class="empty">No teams yet.</p>';
    return;
  }
  els.scoreboardWrap.innerHTML = `<p class="tiny">Teams: ${board.length} • Drivers Tracked: ${uniqueRaceDrivers().length}</p>`;
}

function isRaceComplete(race, driverNames) {
  if (!race.results) return false;
  if (!driverNames.length) return false;
  return driverNames.every((name) => race.results[name] !== undefined && race.results[name] !== "");
}

function renderMegaBoard(board) {
  const driverNames = uniqueRaceDrivers();
  const completedCount = state.races.filter((r) => isRaceComplete(r, driverNames)).length;
  const seasonPct = state.races.length
    ? Math.round((completedCount / state.races.length) * 100)
    : 0;

  if (!board.length) {
    els.megaBoard.innerHTML = '<p class="empty">Build teams to power on the MEGA BOARD.</p>';
    return;
  }

  const maxPoints = Math.max(1, ...board.map((b) => b.points));
  const lights = state.races
    .map((race, idx) => {
      const done = idx < completedCount;
      const current = idx === completedCount && completedCount < state.races.length;
      return `<div class="lamp ${done ? "done" : "todo"} ${current ? "current" : ""}">${idx + 1}</div>`;
    })
    .join("");

  const rows = board
    .map((row, idx) => {
      const pct = Math.max(4, Math.round((row.points / maxPoints) * 100));
      return `
        <div class="mega-row">
          <div class="mega-rank">${idx + 1}</div>
          <div class="mega-content">
            <div class="mega-meta">
              <span class="mega-team">${row.teamName}</span>
              <span class="mega-points">${row.points} pts</span>
            </div>
            <div class="mega-track">
              <div class="mega-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  els.megaBoard.innerHTML = `
    <div class="mega-head">SEASON PROGRESS: ${completedCount}/${state.races.length} ROUNDS COMPLETE</div>
    <div class="season-lights">${lights}</div>
    ${rows}
    <div class="car-lane">
      <div class="pixel-car" style="--car-left:${Math.max(3, seasonPct)}%"></div>
    </div>
  `;
}

function racesByRound() {
  return [...state.races]
    .map((race, index) => ({ race, index, round: roundFromRaceName(race.name) }))
    .sort((a, b) => {
      const aRound = Number.isInteger(a.round) ? a.round : Number.MAX_SAFE_INTEGER;
      const bRound = Number.isInteger(b.round) ? b.round : Number.MAX_SAFE_INTEGER;
      return aRound - bRound || a.index - b.index;
    })
    .map((entry) => entry.race);
}

function shortRoundLabel(raceName, index) {
  const round = roundFromRaceName(raceName);
  if (Number.isInteger(round)) return `R${String(round).padStart(2, "0")}`;
  return `R${String(index + 1).padStart(2, "0")}`;
}

function seasonSnapshots() {
  const teams = [...state.teams];
  if (!teams.length) return [];

  const orderedRaces = racesByRound();
  const snapshots = [];
  const totals = new Map(teams.map((team) => [team.id, 0]));

  orderedRaces.forEach((race, index) => {
    const hasResults = race?.results && Object.keys(race.results).length > 0;
    if (!hasResults) return;

    teams.forEach((team) => {
      const prev = totals.get(team.id) || 0;
      totals.set(team.id, prev + teamPointsForRace(team, race));
    });

    const ranking = [...teams]
      .map((team) => ({ teamId: team.id, points: totals.get(team.id) || 0, name: team.name }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

    const positions = new Map();
    ranking.forEach((row, rankIndex) => {
      positions.set(row.teamId, rankIndex + 1);
    });

    const points = new Map(ranking.map((row) => [row.teamId, row.points]));
    snapshots.push({
      raceName: race.name,
      raceLabel: shortRoundLabel(race.name, index),
      positions,
      points
    });
  });

  return snapshots;
}

function pointForChart(index, value, count, minY, maxY, width, height) {
  const xRange = width;
  const yRange = height;
  const x = count <= 1 ? 0 : (index / (count - 1)) * xRange;
  const y = minY === maxY ? yRange / 2 : ((value - minY) / (maxY - minY)) * yRange;
  return { x, y };
}

function teamNameSizeClass(teamName) {
  const length = String(teamName || "").trim().length;
  if (length >= 56) return "is-tight";
  if (length >= 38) return "is-compact";
  return "";
}

function renderSeasonSummary() {
  if (!els.seasonSummaryWrap) return;
  if (!state.teams.length) {
    els.seasonSummaryWrap.innerHTML = '<p class="empty">Add teams to unlock the season summary.</p>';
    return;
  }

  const snapshots = seasonSnapshots();
  if (!snapshots.length) {
    els.seasonSummaryWrap.innerHTML = '<p class="empty">Enter race results to plot race-by-race trends.</p>';
    return;
  }

  const teamRows = computeScoreboard();
  const colorByTeamId = new Map(
    teamRows.map((row, idx) => [row.teamId, TEAM_COLORS[idx % TEAM_COLORS.length]])
  );
  const labels = snapshots.map((s) => s.raceLabel);
  const count = snapshots.length;

  const positionSeries = state.teams.map((team) => {
    const values = snapshots.map((snap) => snap.positions.get(team.id) || state.teams.length);
    return { team, values };
  });
  const pointSeries = state.teams.map((team) => {
    const values = snapshots.map((snap) => snap.points.get(team.id) || 0);
    return { team, values };
  });

  const positionRows = positionSeries
    .map(({ team, values }) => {
      const points = values
        .map((value, index) => {
          const p = pointForChart(index, value, count, 1, state.teams.length, 900, 260);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(" ");
      const lastValue = values[values.length - 1];
      const color = colorByTeamId.get(team.id) || "#ffffff";
      return `
        <polyline class="trend-line" points="${points}" stroke="${color}" fill="none"></polyline>
        <circle cx="${pointForChart(count - 1, lastValue, count, 1, state.teams.length, 900, 260).x.toFixed(1)}"
                cy="${pointForChart(count - 1, lastValue, count, 1, state.teams.length, 900, 260).y.toFixed(1)}"
                r="5.2" fill="${color}"></circle>
      `;
    })
    .join("");

  const maxPoints = Math.max(1, ...pointSeries.flatMap((series) => series.values));
  const pointRows = pointSeries
    .map(({ team, values }) => {
      const points = values
        .map((value, index) => {
          const p = pointForChart(index, value, count, 0, maxPoints, 900, 260);
          return `${p.x.toFixed(1)},${(260 - p.y).toFixed(1)}`;
        })
        .join(" ");
      const lastValue = values[values.length - 1];
      const lastPoint = pointForChart(count - 1, lastValue, count, 0, maxPoints, 900, 260);
      const color = colorByTeamId.get(team.id) || "#ffffff";
      return `
        <polyline class="trend-line" points="${points}" stroke="${color}" fill="none"></polyline>
        <rect x="${(lastPoint.x - 6).toFixed(1)}" y="${(260 - lastPoint.y - 6).toFixed(1)}" width="12" height="12" fill="${color}"></rect>
      `;
    })
    .join("");

  const xTicks = labels
    .map((label, index) => {
      const x = pointForChart(index, 0, count, 0, 1, 900, 1).x.toFixed(1);
      return `<text x="${x}" y="294" class="axis-label">${label}</text>`;
    })
    .join("");

  const positionTicks = Array.from({ length: state.teams.length }, (_, i) => i + 1)
    .map((value) => {
      const y = pointForChart(0, value, 1, 1, state.teams.length, 900, 260).y.toFixed(1);
      return `<text x="-16" y="${y}" class="axis-label axis-left">P${value}</text>`;
    })
    .join("");

  const pointsTicks = [0, Math.ceil(maxPoints * 0.25), Math.ceil(maxPoints * 0.5), Math.ceil(maxPoints * 0.75), maxPoints]
    .map((value) => {
      const y = (260 - pointForChart(0, value, 1, 0, maxPoints, 900, 260).y).toFixed(1);
      return `<text x="-16" y="${y}" class="axis-label axis-left">${value}</text>`;
    })
    .join("");

  const leader = teamRows[0];
  const latestRace = snapshots[snapshots.length - 1];
  const positionTeamLabels = teamRows
    .map((row) => {
      const latestPos = latestRace.positions.get(row.teamId);
      const color = colorByTeamId.get(row.teamId) || "#ffffff";
      const nameSizeClass = teamNameSizeClass(row.teamName);
      return `
        <li class="chart-team-item">
          <span class="summary-team-car" style="--team-color:${color};"></span>
          <span class="chart-team-name ${nameSizeClass}">${row.teamName}</span>
          <span class="chart-team-meta">P${latestPos}</span>
        </li>
      `;
    })
    .join("");

  const pointsTeamLabels = teamRows
    .map((row) => {
      const latestPts = latestRace.points.get(row.teamId) || 0;
      const color = colorByTeamId.get(row.teamId) || "#ffffff";
      const nameSizeClass = teamNameSizeClass(row.teamName);
      return `
        <li class="chart-team-item">
          <span class="summary-team-car" style="--team-color:${color};"></span>
          <span class="chart-team-name ${nameSizeClass}">${row.teamName}</span>
          <span class="chart-team-meta">${latestPts} pts</span>
        </li>
      `;
    })
    .join("");

  els.seasonSummaryWrap.innerHTML = `
    <section class="summary-hero">
      <div class="summary-stat">
        <span>Current Leader</span>
        <strong>${leader ? leader.teamName : "--"}</strong>
      </div>
      <div class="summary-stat">
        <span>Races Logged</span>
        <strong>${snapshots.length}</strong>
      </div>
      <div class="summary-stat">
        <span>Latest Round</span>
        <strong>${latestRace.raceLabel} ${latestRace.raceName.replace(/^R\d{1,2}\s*/i, "")}</strong>
      </div>
    </section>
    <section class="retro-chart-grid">
      <article class="chart-card">
        <h3>Position Tracker</h3>
        <div class="chart-body">
          <svg class="summary-svg" viewBox="-48 -12 960 324" role="img" aria-label="Team positions by race">
            <rect x="0" y="0" width="900" height="260" class="chart-bg"></rect>
            <g class="grid-lines">
              ${Array.from({ length: state.teams.length }, (_, i) => {
                const y = pointForChart(0, i + 1, 1, 1, state.teams.length, 900, 260).y.toFixed(1);
                return `<line x1="0" y1="${y}" x2="900" y2="${y}"></line>`;
              }).join("")}
            </g>
            <line x1="0" y1="260" x2="900" y2="260" class="axis-line"></line>
            <line x1="0" y1="0" x2="0" y2="260" class="axis-line"></line>
            ${positionRows}
            ${xTicks}
            ${positionTicks}
          </svg>
          <aside class="chart-team-list" aria-label="Team list for position tracker">
            <ul>${positionTeamLabels}</ul>
          </aside>
        </div>
      </article>
      <article class="chart-card">
        <h3>Points Race</h3>
        <div class="chart-body">
          <svg class="summary-svg" viewBox="-48 -12 960 324" role="img" aria-label="Cumulative points by race">
            <rect x="0" y="0" width="900" height="260" class="chart-bg"></rect>
            <g class="grid-lines">
              ${Array.from({ length: 5 }, (_, i) => {
                const value = Math.round((i / 4) * maxPoints);
                const y = (260 - pointForChart(0, value, 1, 0, maxPoints, 900, 260).y).toFixed(1);
                return `<line x1="0" y1="${y}" x2="900" y2="${y}"></line>`;
              }).join("")}
            </g>
            <line x1="0" y1="260" x2="900" y2="260" class="axis-line"></line>
            <line x1="0" y1="0" x2="0" y2="260" class="axis-line"></line>
            ${pointRows}
            ${xTicks}
            ${pointsTicks}
          </svg>
          <aside class="chart-team-list" aria-label="Team list for points race">
            <ul>${pointsTeamLabels}</ul>
          </aside>
        </div>
      </article>
    </section>
  `;
}

function exportLeague() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "f1_fantasy_league_2026.json";
  a.click();
  URL.revokeObjectURL(url);
}

function hasValidLeagueShape(parsed) {
  return Boolean(parsed && Array.isArray(parsed.teams) && Array.isArray(parsed.races));
}

function applyLeagueState(parsed) {
  if (!hasValidLeagueShape(parsed)) return false;
  state.teams = parsed.teams;
  state.races = removeCancelledRaces(parsed.races);
  normalizeRaceResultsToDriverNames();
  save();
  return true;
}

function importLeague(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!applyLeagueState(parsed)) throw new Error("Invalid format");
      renderAll();
    } catch (_err) {
      alert("Invalid JSON format.");
    }
  };
  reader.readAsText(file);
}

async function autoLoadBundledLeagueJson() {
  try {
    const response = await fetch(DEFAULT_LEAGUE_JSON_PATH, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return false;
    const parsed = await response.json();
    return applyLeagueState(parsed);
  } catch (_err) {
    return false;
  }
}

function resetLeague() {
  if (!confirm("This will erase all teams, drivers, races, and points. Continue?")) return;
  state.teams = [];
  state.races = [];
  save();
  renderAll();
}

async function sync2026ScheduleFromApi() {
  if (state.scheduleSynced) return;
  try {
    setPullStatus(`Syncing ${ONLINE_SEASON} schedule...`);
    await pull2026Schedule();
    save();
    renderAll();
    setPullStatus(`${ONLINE_SEASON} schedule synced. Select a round and pull results.`, "ok");
  } catch (_err) {
    setPullStatus(`Using built-in ${ONLINE_SEASON} schedule (online sync unavailable).`, "error");
  }
}

function renderAll() {
  renderTeamSelect();
  renderTeams();
  renderRaceControls();
  renderPullRaceSelect();
  renderRaceEntry();
  renderScoreboard();
  renderSeasonSummary();
}

els.teamForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.teamName.value.trim();
  if (!name) return;

  const exists = state.teams.some((t) => t.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    alert("Team name already exists.");
    return;
  }

  state.teams.push({ id: uid("team"), name, drivers: [] });
  els.teamName.value = "";
  save();
  renderAll();
});

els.driverForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const teamId = els.driverTeam.value;
  const driverName = els.driverName.value.trim();
  if (!teamId || !driverName) return;

  const team = state.teams.find((t) => t.id === teamId);
  if (!team) return;
  if (team.drivers.length >= MAX_DRIVERS_PER_TEAM) {
    alert(`Each fantasy team can have exactly ${MAX_DRIVERS_PER_TEAM} drivers.`);
    return;
  }

  const duplicateInTeam = team.drivers.some((d) => d.name.toLowerCase() === driverName.toLowerCase());
  if (duplicateInTeam) {
    alert("Driver already exists on this team.");
    return;
  }

  team.drivers.push({ id: uid("driver"), name: driverName });
  els.driverName.value = "";
  save();
  renderAll();
});

if (els.raceForm) {
  els.raceForm.addEventListener("submit", (event) => event.preventDefault());
}

els.exportBtn.addEventListener("click", exportLeague);
els.importFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importLeague(file);
  event.target.value = "";
});
els.resetBtn.addEventListener("click", resetLeague);
if (els.pullResultsBtn) {
  els.pullResultsBtn.addEventListener("click", pullOnlineRaceResults);
}
if (els.pullRaceSelect) {
  els.pullRaceSelect.addEventListener("change", () => {
    const round = Number(els.pullRaceSelect.value);
    const race = raceByRound(round);
    const raceSelect = document.getElementById("race-select");
    if (race && raceSelect) {
      raceSelect.value = race.id;
      renderRaceEntry();
    }
  });
}
els.bannerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activatePage(button.dataset.page, true);
  });
});
window.addEventListener("hashchange", () => {
  activatePage(pageKeyFromHash(), false);
});

async function bootstrap() {
  load();

  const loadedBundledLeague = await autoLoadBundledLeagueJson();
  if (!loadedBundledLeague) {
    initDefaultRaces();
    ensurePreloadedTeams();
    normalizeRaceResultsToDriverNames();
    save();
  }

  renderAll();
  activatePage(pageKeyFromHash(), false);
  sync2026ScheduleFromApi();
}

bootstrap();
