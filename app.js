const STORAGE_KEY = "retro_f1_fantasy_v1";
const MAX_DRIVERS_PER_TEAM = 4;
const ONLINE_SEASON = 2026;
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
  "R04 Bahrain GP (Sakhir)",
  "R05 Saudi Arabia GP (Jeddah)",
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
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  resetBtn: document.getElementById("reset-btn")
};

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function roundFromRaceName(name) {
  const match = String(name || "").match(/^R(\d{1,2})\b/i);
  if (!match) return null;
  return Number(match[1]);
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
  if (!scheduleRows.length) return;

  const existingByRound = new Map(
    state.races.map((race) => [roundFromRaceName(race.name), race]).filter(([round]) => round !== null)
  );

  state.races = scheduleRows.map((row) => {
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

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.teams) && Array.isArray(parsed.races)) {
      state.teams = parsed.teams;
      state.races = parsed.races;
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
  renderScoreboard();
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
          <div class="mega-track">
            <div class="mega-fill" style="width:${pct}%"></div>
            <div class="mega-label">${row.teamName} :: ${row.points} pts</div>
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
  state.races = parsed.races;
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
  sync2026ScheduleFromApi();
}

bootstrap();
