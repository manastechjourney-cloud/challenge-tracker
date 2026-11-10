const listElement = document.getElementById("challenge-list");
const messageElement = document.getElementById("status-message");
const form = document.getElementById("challenge-form");
const formMessage = document.getElementById("form-message");
const startDateInput = document.getElementById("start-date");

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

async function loadChallenges() {
  messageElement.textContent = "Loading...";
  try {
    const response = await fetch("/challenges");
    if (!response.ok) {
      throw new Error("Server replied " + response.status);
    }
    const challenges = await response.json();
    renderChallenges(challenges);
  } catch (error) {
    messageElement.textContent = "Could not load challenges: " + error.message;
  }
}

function renderChallenges(challenges) {
  listElement.replaceChildren();

  if (challenges.length === 0) {
    messageElement.textContent = "No challenges yet. Create one below.";
    return;
  }
  messageElement.textContent = "";

  for (const challenge of challenges) {
    const item = document.createElement("li");

    const info = document.createElement("div");
    const title = document.createElement("a");
    title.href = `/static/challenge.html?id=${challenge.id}`;
    title.textContent = challenge.name;

    const mode = challenge.strict_mode ? "strict" : "relaxed";
    const details = document.createElement("span");
    details.textContent =
      ` · ${challenge.duration_days} days · starts ${challenge.start_date} · ${mode}`;
    info.append(title, details);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteChallenge(challenge));

    item.append(info, deleteButton);
    listElement.appendChild(item);
  }
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
    await loadChallenges();
  } catch (error) {
    messageElement.textContent = "Could not delete: " + error.message;
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
    formMessage.textContent = "Challenge created!";
    await loadChallenges();
  } catch (error) {
    formMessage.textContent = "Could not create: " + error.message;
  } finally {
    submitButton.disabled = false;
  }
});

startDateInput.value = todayString();
loadChallenges();