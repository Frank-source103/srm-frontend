import { useState, useEffect } from "react";
import ImportExcel from "./ImportExcel.jsx";

const API_URL = "https://backend-api-ghnt.onrender.com";

const THEMES = [
  { id: "academic", name: "Academic Classic" },
  { id: "modern", name: "Modern Indigo" },
  { id: "dark", name: "Dark Slate" },
];

const STUDENT_FIELDS = [
  { name: "reg_no", label: "Reg No", type: "text" },
  { name: "first_name", label: "First name", type: "text" },
  { name: "last_name", label: "Last name", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "date_of_birth", label: "Date of birth", type: "date" },
  { name: "department", label: "Department", type: "text" },
];

const COURSE_FIELDS = [
  { name: "code", label: "Course code", type: "text" },
  { name: "title", label: "Title", type: "text" },
  { name: "credit_units", label: "Credit units", type: "number" },
];

const RESULT_FIELDS = [
  { name: "reg_no", label: "Student reg no", type: "text" },
  { name: "course_id", label: "Course ID", type: "number" },
  { name: "score", label: "Score", type: "number" },
  { name: "semester", label: "Semester (e.g. 2024/2025-1)", type: "text" },
];

const TABS = [
  { label: "Students", path: "/api/v1/students", idKey: "reg_no", fields: STUDENT_FIELDS },
  { label: "Courses", path: "/api/v1/courses", idKey: "id", fields: COURSE_FIELDS },
  { label: "Results", path: "/api/v1/results", idKey: "id", fields: RESULT_FIELDS },
];

const HIDDEN = ["created_at", "course_id"];

const LABELS = {
  reg_no: "Reg No",
  first_name: "First Name",
  last_name: "Last Name",
  date_of_birth: "Date of Birth",
  credit_units: "Credit Units",
};

function label(key) {
  return (
    LABELS[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatValue(key, value) {
  if (value === null || value === undefined) return "—";
  if (key === "student") return `${value.first_name} ${value.last_name}`;
  if (key === "course") return `${value.code} – ${value.title}`;
  if (key === "date_of_birth" || key.endsWith("_at")) {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return String(value);
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  const found = Object.values(data).find((v) => Array.isArray(v));
  return found || [];
}

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

    const payload = {};
    fields.forEach((f) => {
      payload[f.name] =
        f.type === "number" ? Number(values[f.name]) : values[f.name];
    });

    try {
      await onSave(payload);
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>{isEdit ? "Edit record" : "Add record"}</h2>
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          <input
            type={f.type}
            step={f.type === "number" ? "any" : undefined}
            required
            disabled={isEdit && f.name === idKey}
            value={values[f.name]}
            onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
          />
        </label>
      ))}
      {formError && <p className="error">{formError}</p>}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DataList({ path, idKey, fields, name }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
    const [importing, setImporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_URL}${path}?page=${page}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then((data) => {
        const list = extractList(data);
        setItems(list);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total ?? list.length);
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
  if (importing) {
    return (
      <ImportExcel
        fields={fields}
        path={path}
        name={name}
        onDone={() => {
          setImporting(false);
          setPage(1);
          setReload((n) => n + 1);
        }}
        onCancel={() => setImporting(false)}
      />
    );
  }
  if (error) return <p className="error">Error: {error}</p>;

  const columns = items.length
    ? Object.keys(items[0]).filter((k) => !HIDDEN.includes(k))
    : [];

  return (
    <div>
      <div className="toolbar">
        <span className="count">
          {loading ? "Loading…" : `${total} ${name.toLowerCase()}`}
        </span>
               <div className="actions">
          <button className="btn" onClick={() => setImporting(true)}>
            Upload Excel
          </button>
          <button className="btn primary" onClick={() => setEditing("new")}>
            + Add new
          </button>
        </div>
      </div>

      {loading && <p>Loading... (server may take ~30s to wake up)</p>}
      {!loading && items.length === 0 && <p>Nothing here yet.</p>}

      {!loading && items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{label(c)}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item[idKey] ?? i}>
                  {columns.map((c) => (
                    <td key={c}>
                      {c === "grade" ? (
                        <span className="badge" data-grade={item[c]}>
                          {item[c]}
                        </span>
                      ) : (
                        formatValue(c, item[c])
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="actions">
                      <button className="btn" onClick={() => setEditing(item)}>
                        Edit
                      </button>
                      <button className="btn danger" onClick={() => remove(item)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button
            className="btn"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || loading}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages || loading}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(TABS[0]);
  const [theme, setTheme] = useState("academic");

  return (
    <div className="app" data-theme={theme}>
      <header className="header">
        <div>
          <h1>School Result Management System</h1>
          <p>Student records, courses and results</p>
        </div>
        <select
          className="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          aria-label="Theme"
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            className={`tab ${active.label === tab.label ? "active" : ""}`}
            onClick={() => setActive(tab)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        <DataList
          key={active.label}
          path={active.path}
          idKey={active.idKey}
          fields={active.fields}
          name={active.label}
        />
      </main>
    </div>
  );
}
