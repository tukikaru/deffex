const BASE_URL = "http://localhost:8000";

export async function detectImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/detect`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function getCounters() {
  const res = await fetch(`${BASE_URL}/counters`);
  return res.json();
}

export async function resetCounters() {
  await fetch(`${BASE_URL}/reset`, { method: "POST" });
}
