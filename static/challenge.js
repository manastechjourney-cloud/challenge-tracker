const challengeId = new URLSearchParams(window.location.search).get("id");
const RING_LENGTH = 326.73;

const byId = (id) => document.getElementById(id);
const pageMessage = byId("page-message");
const noteInput = byId("note");
const doneButton = byId("done-button");
const slippedButton = byId("slipped-button");
const ringFill = byId("ring-fill");
const flame = byId("flame");
const historyList = byId("history-list");

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

function renderToday(checkins) {
  const todays = checkins.find((checkin) => checkin.date === todayString());
  const hasCheckedIn = todays !== undefined;

  doneButton.disabled = hasCheckedIn;
  slippedButton.disabled = hasCheckedIn;
  noteInput.disabled = hasCheckedIn;

  byId("today-status").textContent = hasCheckedIn
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
    if (status === "done") {
      launchConfetti();
    }
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