import { useState, useEffect } from "react";

const API_URL = "https://backend-api-ghnt.onrender.com";

export default function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/v1/students`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then((data) =>
        setStudents(Array.isArray(data) ? data : data.data || [])
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading... (the server may take ~30s to wake up)</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>Students</h1>
      {students.length === 0 && <p>No students yet.</p>}
      {students.map((s, i) => (
        <div
          key={s.reg_no || i}
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}
        >
          {Object.entries(s).map(([key, value]) => (
            <div key={key}>
              <b>{key}:</b> {String(value)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}