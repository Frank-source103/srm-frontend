import { useState, useEffect } from "react";

const API_URL = "https://backend-api-ghnt.onrender.com";

const TABS = [
  { label: "Students", path: "/api/v1/students" },
  { label: "Courses", path: "/api/v1/courses" },
  { label: "Results", path: "/api/v1/results" },
];

// Finds the list inside the API response, whatever key it's under
function extractList(data) {
  if (Array.isArray(data)) return data;
  const found = Object.values(data).find((v) => Array.isArray(v));
  return found || [];
}

function DataList({ path }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_URL}${path}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then((data) => setItems(extractList(data)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  if (loading) return <p>Loading... (server may take ~30s to wake up)</p>;
  if (error) return <p>Error: {error}</p>;
  if (items.length === 0) return <p>Nothing here yet.</p>;

  return items.map((item, i) => (
    <div
      key={item.id || item.reg_no || i}
      style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}
    >
      {Object.entries(item).map(([key, value]) => (
        <div key={key}>
          <b>{key}:</b> {String(value)}
        </div>
      ))}
    </div>
  ));
}

export default function App() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>School Result Management</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActive(tab)}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #333",
              background: active.label === tab.label ? "#333" : "#fff",
              color: active.label === tab.label ? "#fff" : "#333",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <DataList path={active.path} />
    </div>
  );
  }
