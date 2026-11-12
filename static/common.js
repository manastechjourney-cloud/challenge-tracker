function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
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

async function sendJson(method, url, body) {
  const options = { method: method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = "Server replied " + response.status;
    try {
      const error = await response.json();
      message = describeError(error.detail);
    } catch (parseError) {
      // The reply had no JSON body, so keep the generic message.
    }
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function showToast(message, type = "info") {
  let container = document.getElementById("toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "toasts";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}