const params = new URLSearchParams(window.location.search);
const challengeId = params.get("id");

const nameElement = document.getElementById("challenge-name");
const infoElement = document.getElementById("challenge-info");
const pageMessage = document.getElementById("page-message");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const streakElement = document.getElementById("stat-streak");
const completedElement = document.getElementById("stat-completed");
const leftElement = document.getElementById("stat-left");
const slippedStatElement = document.getElementById("stat-slipped");
const todayStatus = document.getElementById("today-status");
const noteInput = document.getElementById("note");
const doneButton = document.getElementById("done-button");
const slippedButton = document.getElementById("slipped-button");
const historyList = document.getElementById("history-list");

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function describeError(detail) {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((problem) => problem.msg).join("; ");
  }
  return "Unknown error";
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Server replied " + response.status);
  }
  return response.json();
}

function renderChallenge(challenge) {
  nameElement.textContent = challenge.name;
  document.title = challenge.name;
  const mode = challenge.strict_mode ? "Strict mode" : "Relaxed mode";
  const description = challenge.description ? challenge.description + " · " : "";
  infoElement.textContent =
    `${description}${challenge.duration_days} days from ${challenge.start_date} · ${mode}`;
}

function renderProgress(progress) {
  progressBar.value = progress.completion_percent;
  progressText.textContent = `${progress.completion_percent}% complete`;
  streakElement.textContent = progress.current_streak;
  completedElement.textContent = progress.days_completed;
  leftElement.textContent = progress.days_left;
  slippedStatElement.textContent = progress.days_slipped;
}

function renderToday(checkins) {
  const todays = checkins.find((checkin) => checkin.date === todayString());
  const hasCheckedIn = todays !== undefined;

  doneButton.disabled = hasCheckedIn;
  slippedButton.disabled = hasCheckedIn;
  noteInput.disabled = hasCheckedIn;

  todayStatus.textContent = hasCheckedIn
    ? `You already checked in today: ${todays.status}.`
    : "You haven't checked in today yet.";
}

function renderHistory(checkins) {
  historyList.replaceChildren();

  if (checkins.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No check-ins yet.";
    historyList.appendChild(empty);
    return;
  }

  for (const checkin of [...checkins].reverse()) {
    const item = document.createElement("li");
    item.classList.add(checkin.status);

    const date = document.createElement("strong");
    date.textContent = checkin.date;

    const details = document.createElement("span");
    const note = checkin.note ? ` · ${checkin.note}` : "";
    details.textContent = ` · ${checkin.status}${note}`;

    const info = document.createElement("div");
    info.append(date, details);
    item.appendChild(info);
    historyList.appendChild(item);
  }
}

async function loadPage() {
  if (!challengeId) {
    pageMessage.textContent = "No challenge selected.";
    return;
  }
  try {
    const [challenge, progress, checkins] = await Promise.all([
      getJson(`/challenges/${challengeId}`),
      getJson(`/challenges/${challengeId}/progress`),
      getJson(`/challenges/${challengeId}/checkins`),
    ]);
    renderChallenge(challenge);
    renderProgress(progress);
    renderToday(checkins);
    renderHistory(checkins);
    pageMessage.textContent = "";
  } catch (error) {
    pageMessage.textContent = "Could not load this challenge: " + error.message;
  }
}

async function submitCheckin(status) {
  pageMessage.textContent = "";
  doneButton.disabled = true;
  slippedButton.disabled = true;

  const note = noteInput.value.trim();

  try {
    const response = await fetch(`/challenges/${challengeId}/checkins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status, note: note || null }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(describeError(error.detail));
    }
    noteInput.value = "";
    await loadPage();
  } catch (error) {
    pageMessage.textContent = "Could not save check-in: " + error.message;
    doneButton.disabled = false;
    slippedButton.disabled = false;
  }
}

doneButton.addEventListener("click", () => submitCheckin("done"));
slippedButton.addEventListener("click", () => submitCheckin("slipped"));

loadPage();