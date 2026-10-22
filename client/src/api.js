export const SERVER = "http://localhost:5000";
const API = `${SERVER}/api`;

// One helper for every call to the Node server.
// Pass a FormData as body to upload a photo; anything else is sent as JSON.
export async function request(path, { method = "GET", body, token } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body && !isForm) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    throw new Error("Cannot reach the server. Check that the Node server is running on port 5000.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
