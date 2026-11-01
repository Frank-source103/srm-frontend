import { useState, useEffect } from "react";

const API_URL = "https://backend-api-ghnt.onrender.com";

const STUDENT_FIELDS = [
  { name: "reg_no", label: "Reg No", type: "text" },
  { name: "first_name", label: "First name", type: "text" },
  { name: "last_name", label: "Last name", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "date_of_birth", label: "Date of birth", type: "date" },
  { name: "department", label: "Department", type: "text" },
];

const TABS = [
  { label: "Students", path: "/api/v1/students", idKey: "reg_no", fields: STUDENT_FIELDS },
  { label: "Courses", path: "/api/v1/courses" },
  { label: "Results", path: "/api/v1/results" },
];

function extractList(data) {
  if (Array.isArray(data)) return data;
  const found = Object.values(data).find((v) => Array.isArray(v));
  return found || [];
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 8,
  marginBottom: 12,
  boxSizing: "border-box",
};

function ItemForm({ fields, initial, idKey, onCancel, onSave }) {
  const isEdit = Boolean(initial);
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f) => {
      const raw = initial ? initial[f.name] : "";
      v[f.name] =
        f.type === "date" && raw ? String(raw).slice(0, 10) : raw ?? "";
    });
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await onSave(values);
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isEdit ? "Edit" : "Add"}</h2>
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          <input
            style={inputStyle}
            type={f.type}
            required
            disabled={isEdit && f.name === idKey}
            value={values[f.name]}
            onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
          />
        </label>
      ))}
      {formError && <p style={{ color: "red" }}>{formError}</p>}
      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>{" "}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

function DataList({ path, idKey, fields }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null); // null, "new", or an item

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_URL}${path}?page=${page}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then((data) => {
        setItems(extractList(data));
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [path, page, reload]);

  async function save(values) {
    const isEdit = editing !== "new";
    const url = isEdit
      ? `${API_URL}${path}/${editing[idKey]}`
      : `${API_URL}${path}`;
    const body = { ...values };
    if (isEdit) delete body[idKey];

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || "Request failed: " + res.status);
    }
    setEditing(null);
    setReload((n) => n + 1);
  }

  async function remove(item) {
    if (!window.confirm("Delete this record?")) return;
    const res = await fetch(`${API_URL}${path}/${item[idKey]}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || data.error || "Delete failed: " + res.status);
      return;
    }
    if (items.length === 1 && page > 1) setPage(page - 1);
    setReload((n) => n + 1);
  }

  if (editing) {
    return (
      <ItemForm
        fields={fields}
        idKey={idKey}
        initial={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={save}
      />
    );
  }

  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      {fields && (
        <button onClick={() => setEditing("new")} style={{ marginBottom: 12 }}>
          + Add new
        </button>
      )}
      {loading && <p>Loading... (server may take ~30s to wake up)</p>}
      {!loading && items.length === 0 && <p>Nothing here yet.</p>}

      {!loading &&
        items.map((item, i) => (
          <div
            key={item[idKey] || item.id || i}
            style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            {Object.entries(item).map(([key, value]) => (
              <div key={key}>
                <b>{key}:</b> {String(value)}
              </div>
            ))}
            {fields && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setEditing(item)}>Edit</button>{" "}
                <button onClick={() => remove(item)}>Delete</button>
              </div>
            )}
          </div>
        ))}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button onClick={() => setPage(page - 1)} disabled={page === 1 || loading}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPages || loading}>
            Next
          </button>
        </div>
      )}
    </div>
  );
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
      <DataList
        key={active.label}
        path={active.path}
        idKey={active.idKey}
        fields={active.fields}
      />
    </div>
  );
}
