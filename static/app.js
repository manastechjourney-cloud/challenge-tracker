const listElement = document.getElementById("challenge-list");
const messageElement = document.getElementById("status-message");
const form = document.getElementById("challenge-form");
const formMessage = document.getElementById("form-message");
const startDateInput = document.getElementById("start-date");

async function loadChallenges() {
  messageElement.textContent = "Loading...";
  try {
    const challenges = await getJson("/challenges");
    const progresses = await Promise.all(
      challenges.map((challenge) => getJson(`/challenges/${challenge.id}/progress`))
    );
    renderChallenges(challenges, progresses);
  } catch (error) {
    messageElement.textContent = "Could not load challenges: " + error.message;
  }
}

function renderChallenges(challenges, progresses) {
  listElement.replaceChildren();

  if (challenges.length === 0) {
    messageElement.textContent = "No challenges yet. Create one below.";
    return;
  }
  messageElement.textContent = "";

  challenges.forEach((challenge, index) => {
    const progress = progresses[index];
    const item = document.createElement("li");

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("a");
    title.href = `/static/challenge.html?id=${challenge.id}`;
    title.textContent = challenge.name;

    const mode = challenge.strict_mode ? "strict" : "relaxed";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${challenge.duration_days} days · starts ${challenge.start_date} · ${mode}`;

    const bar = document.createElement("div");
    bar.className = "mini-bar";
    const fill = document.createElement("div");
    fill.className = "mini-fill";
    bar.appendChild(fill);

    const stats = document.createElement("span");
    stats.className = "meta";
    stats.textContent = `${progress.completion_percent}% complete · 🔥 ${progress.current_streak} day streak`;

    body.append(title, meta, bar, stats);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteChallenge(challenge));

    item.append(body, deleteButton);
    listElement.appendChild(item);

    setTimeout(() => {
      fill.style.width = progress.completion_percent + "%";
    }, 50);
  });
}

async function deleteChallenge(challenge) {
  const confirmed = confirm(`Delete "${challenge.name}" and all its check-ins?`);
  if (!confirmed) {
    return;
  }
  try {
    const response = await fetch(`/challenges/${challenge.id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error("Server replied " + response.status);
    }
    showToast("Challenge deleted.", "success");
    await loadChallenges();
  } catch (error) {
    showToast("Could not delete: " + error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;

  const payload = {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim(),
    duration_days: Number(document.getElementById("duration").value),
    start_date: startDateInput.value,
    strict_mode: document.getElementById("strict").checked,
  };

  try {
    const response = await fetch("/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(describeError(error.detail));
    }
    form.reset();
    startDateInput.value = todayString();
    showToast("Challenge created.", "success");
    await loadChallenges();
  } catch (error) {
    showToast("Could not create: " + error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

const templateGrid = document.getElementById("template-grid");

async function loadTemplates() {
  try {
    const templates = await getJson("/templates");
    renderTemplates(templates);
  } catch (error) {
    templateGrid.textContent = "Could not load templates.";
  }
}

function renderTemplates(templates) {
  templateGrid.replaceChildren();

  for (const template of templates) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "template-card";

    const icon = document.createElement("span");
    icon.className = "template-icon";
    icon.textContent = template.icon;

    const name = document.createElement("strong");
    name.textContent = template.name;

    const mode = template.strict_mode ? "strict" : "relaxed";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${template.duration_days} days · ${mode}`;

    card.append(icon, name, meta);
    card.addEventListener("click", () => startFromTemplate(template, card));
    templateGrid.appendChild(card);
  }
}

async function startFromTemplate(template, card) {
  card.disabled = true;
  try {
    await sendJson("POST", "/challenges", {
      name: template.name,
      description: template.description,
      duration_days: template.duration_days,
      start_date: todayString(),
      strict_mode: template.strict_mode,
    });
    showToast(`Started "${template.name}" today.`, "success");
    await loadChallenges();
  } catch (error) {
    showToast("Could not start: " + error.message, "error");
  } finally {
    card.disabled = false;
  }
}
startDateInput.value = todayString();
loadTemplates();
loadChallenges();