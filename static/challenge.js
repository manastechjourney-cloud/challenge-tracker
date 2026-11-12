const challengeId = new URLSearchParams(window.location.search).get("id");
const RING_LENGTH = 326.73;

const byId = (id) => document.getElementById(id);
const pageMessage = byId("page-message");
const noteInput = byId("note");
const dateInput = byId("checkin-date");
const doneButton = byId("done-button");
const slippedButton = byId("slipped-button");
const ringFill = byId("ring-fill");
const flame = byId("flame");
const historyList = byId("history-list");

let currentChallenge = null;
let currentCheckins = [];
let dateInitialized = false;

function renderChallenge(challenge) {
  byId("challenge-name").textContent = challenge.name;
  document.title = challenge.name;
  const mode = challenge.strict_mode ? "Strict mode" : "Relaxed mode";
  const description = challenge.description ? challenge.description + " · " : "";
  byId("challenge-info").textContent =
    `${description}${challenge.duration_days} days from ${challenge.start_date} · ${mode}`;
}

function renderProgress(progress) {
  const percent = progress.completion_percent;
  ringFill.style.strokeDashoffset = RING_LENGTH * (1 - percent / 100);
  byId("ring-percent").textContent = `${percent}%`;
  byId("stat-streak").textContent = progress.current_streak;
  byId("stat-completed").textContent = progress.days_completed;
  byId("stat-left").textContent = progress.days_left;
  byId("stat-slipped").textContent = progress.days_slipped;

  const scale = 1 + Math.min(progress.current_streak, 30) / 40;
  flame.style.setProperty("--scale", scale);
  flame.classList.toggle("cold", progress.current_streak === 0);
}

function setupDatePicker(challenge) {
  const today = todayString();
  const lastDay = addDays(challenge.start_date, challenge.duration_days - 1);
  dateInput.min = challenge.start_date;
  dateInput.max = today < lastDay ? today : lastDay;

  const outOfRange = dateInput.value < dateInput.min || dateInput.value > dateInput.max;
  if (!dateInitialized || outOfRange) {
    dateInput.value = today < challenge.start_date ? challenge.start_date : dateInput.max;
    dateInitialized = true;
  }
} 

function setFormEnabled(enabled) {
  doneButton.disabled = !enabled;
  slippedButton.disabled = !enabled;
  noteInput.disabled = !enabled;
}

function updateCheckinForm() {
  if (!currentChallenge) {
    return;
  }
  const today = todayString();
  const status = byId("today-status");

  if (today < currentChallenge.start_date) {
    dateInput.disabled = true;
    setFormEnabled(false);
    status.textContent = `This challenge starts on ${currentChallenge.start_date}.`;
    return;
  }
  dateInput.disabled = false;

  const chosen = dateInput.value;
  if (!chosen) {
    setFormEnabled(false);
    status.textContent = "Pick a day to check in for.";
    return;
  }

  const existing = currentCheckins.find((checkin) => checkin.date === chosen);
  const when = chosen === today ? "today" : "on " + chosen;
  setFormEnabled(existing === undefined);
  status.textContent = existing
    ? `You already checked in ${when}: ${existing.status}.`
    : `You haven't checked in ${when} yet.`;
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

    const otherStatus = checkin.status === "done" ? "slipped" : "done";
    const switchButton = document.createElement("button");
    switchButton.type = "button";
    switchButton.className = "ghost";
    switchButton.textContent = `Mark ${otherStatus}`;
    switchButton.addEventListener("click", () => changeStatus(checkin, otherStatus));

    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "danger";
    undoButton.textContent = "Undo";
    undoButton.addEventListener("click", () => undoCheckin(checkin));

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(switchButton, undoButton);

    item.append(info, actions);
    historyList.appendChild(item);
  }
}

function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const colors = ["#8b5cf6", "#22d3ee", "#34d399", "#fbbf24", "#fb7185"];
  const pieces = Array.from({ length: 120 }, () => ({
    x: canvas.width / 2,
    y: canvas.height * 0.6,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 4,
    size: Math.random() * 8 + 4,
    spin: Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let frames = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += 0.2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    frames += 1;
    if (frames < 140) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }
  tick();
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
    currentChallenge = challenge;
    currentCheckins = checkins;
    renderChallenge(challenge);
    renderProgress(progress);
    setupDatePicker(challenge);
    updateCheckinForm();
    renderHistory(checkins);
    pageMessage.textContent = "";
  } catch (error) {
    pageMessage.textContent = "Could not load this challenge: " + error.message;
  }
}

async function submitCheckin(status) {
  setFormEnabled(false);
  const note = noteInput.value.trim();

  try {
    await sendJson("POST", `/challenges/${challengeId}/checkins`, {
      status: status,
      date: dateInput.value,
      note: note || null,
    });
    noteInput.value = "";
    showToast(
      status === "done" ? "Nice work! Marked done." : "Slip logged. Tomorrow is a new day.",
      "success"
    );
    if (status === "done") {
      launchConfetti();
    }
    await loadPage();
  } catch (error) {
    showToast("Could not save check-in: " + error.message, "error");
    updateCheckinForm();
  }
}

async function changeStatus(checkin, status) {
  try {
    await sendJson("PUT", `/challenges/${challengeId}/checkins/${checkin.id}`, {
      status: status,
      note: checkin.note,
    });
    showToast(`Marked ${checkin.date} as ${status}.`, "success");
    await loadPage();
  } catch (error) {
    showToast("Could not update: " + error.message, "error");
  }
}

async function undoCheckin(checkin) {
  if (!confirm(`Remove the check-in for ${checkin.date}?`)) {
    return;
  }
  try {
    await sendJson("DELETE", `/challenges/${challengeId}/checkins/${checkin.id}`);
    showToast(`Removed the check-in for ${checkin.date}.`, "success");
    await loadPage();
  } catch (error) {
    showToast("Could not undo: " + error.message, "error");
  }
}
const editDialog = byId("edit-dialog");
const editForm = byId("edit-form");
const editMessage = byId("edit-message");

function openEditDialog() {
  if (!currentChallenge) {
    return;
  }
  byId("edit-name").value = currentChallenge.name;
  byId("edit-description").value = currentChallenge.description;
  byId("edit-duration").value = currentChallenge.duration_days;
  byId("edit-start").value = currentChallenge.start_date;
  byId("edit-strict").checked = currentChallenge.strict_mode;
  editMessage.textContent = "";
  editDialog.showModal();
}

async function saveEdit(event) {
  event.preventDefault();

  const edited = {
    name: byId("edit-name").value.trim(),
    description: byId("edit-description").value.trim(),
    duration_days: Number(byId("edit-duration").value),
    start_date: byId("edit-start").value,
    strict_mode: byId("edit-strict").checked,
  };

  const changes = {};
  for (const [field, value] of Object.entries(edited)) {
    if (value !== currentChallenge[field]) {
      changes[field] = value;
    }
  }

  if (Object.keys(changes).length === 0) {
    editDialog.close();
    showToast("Nothing to change.");
    return;
  }

  try {
    await sendJson("PATCH", `/challenges/${challengeId}`, changes);
    editDialog.close();
    showToast("Challenge updated.", "success");
    await loadPage();
  } catch (error) {
    editMessage.textContent = error.message;
  }
}

byId("edit-button").addEventListener("click", openEditDialog);
byId("edit-cancel").addEventListener("click", () => editDialog.close());
editForm.addEventListener("submit", saveEdit);
editDialog.addEventListener("click", (event) => {
  if (event.target === editDialog) {
    editDialog.close();
  }
});
dateInput.addEventListener("change", updateCheckinForm);
doneButton.addEventListener("click", () => submitCheckin("done"));
slippedButton.addEventListener("click", () => submitCheckin("slipped"));

loadPage();