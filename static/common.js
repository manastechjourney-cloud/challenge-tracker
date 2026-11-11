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