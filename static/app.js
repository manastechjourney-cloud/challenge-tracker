const listElement = document.getElementById("challenge-list");
const messageElement = document.getElementById("status-message");

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
    messageElement.textContent = "No challenges yet.";
    return;
  }
  messageElement.textContent = "";

  for (const challenge of challenges) {
    const item = document.createElement("li");

    const title = document.createElement("strong");
    title.textContent = challenge.name;

    const mode = challenge.strict_mode ? "strict" : "relaxed";
    const details = document.createElement("span");
    details.textContent =
      ` · ${challenge.duration_days} days · starts ${challenge.start_date} · ${mode}`;

    item.append(title, details);
    listElement.appendChild(item);
  }
}

loadChallenges();