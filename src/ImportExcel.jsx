import { useState } from "react";
import readXlsxFile from "read-excel-file";

const API_URL = "https://backend-api-ghnt.onrender.com";

// "First Name", "first-name" and "FIRST_NAME" all become "first_name"
const clean = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function toText(value) {
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${m}-${d}`;
  }
  return String(value ?? "").trim();
}

export default function ImportExcel({ fields, path, name, token, onDone, onCancel }) {
  const [rows, setRows] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(null);
  const [added, setAdded] = useState(0);
  const [failures, setFailures] = useState([]);
  const [finished, setFinished] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setMessage("");
    setRows([]);
    setSkipped(0);

    try {
      const sheet = await readXlsxFile(file);
      if (sheet.length < 2) {
        setMessage("The sheet needs a header row and at least one data row.");
        return;
      }

      const headers = sheet[0].map(clean);
      const missing = fields.filter((f) => !headers.includes(f.name));
      if (missing.length) {
        setMessage(
          "Missing columns: " + missing.map((f) => f.name).join(", ")
        );
        return;
      }

      const parsed = [];
      let skippedCount = 0;
      sheet.slice(1).forEach((cells) => {
        if (cells.every((c) => c === null || c === "")) return; // blank row
        const record = {};
        fields.forEach((f) => {
          const raw = toText(cells[headers.indexOf(f.name)]);
          record[f.name] =
            f.type === "number" ? (raw === "" ? NaN : Number(raw)) : raw;
        });
        const complete = fields.every((f) =>
          f.type === "number"
            ? !Number.isNaN(record[f.name])
            : record[f.name] !== ""
        );
        if (complete) parsed.push(record);
        else skippedCount++;
      });

      if (parsed.length === 0) {
        setMessage("No complete rows found in the file.");
        return;
      }
      setRows(parsed);
      setSkipped(skippedCount);
    } catch (err) {
      setMessage("Could not read that file. Please use a .xlsx file.");
    }
  }

  async function runImport() {
    const failed = [];
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      setProgress(i + 1);
      try {
        const res = await fetch(`${API_URL}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(rows[i]),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || "Error " + res.status);
        }
        ok++;
      } catch (err) {
        failed.push(`${rows[i][fields[0].name]}: ${err.message}`);
      }
    }
    setAdded(ok);
    setFailures(failed);
    setProgress(null);
    setFinished(true);
  }

  const busy = progress !== null;

  return (
    <div className="form-card" style={{ maxWidth: 640 }}>
      <h2>Upload {name} from Excel</h2>

      {!finished && (
        <>
          <p>
            Use a <b>.xlsx</b> file whose first row has these column headers:{" "}
            <b>{fields.map((f) => f.name).join(", ")}</b>
          </p>
          <input type="file" accept=".xlsx" onChange={handleFile} disabled={busy} />
          {message && <p className="error">{message}</p>}

          {rows.length > 0 && (
            <>
              <p>
                {rows.length} row(s) ready from {fileName}
                {skipped > 0 && `, ${skipped} incomplete row(s) skipped`}.
                Preview:
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {fields.map((f) => (
                        <th key={f.name}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {fields.map((f) => (
                          <td key={f.name}>{String(r[f.name])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && <p>…and {rows.length - 5} more</p>}
            </>
          )}

          <div className="form-actions">
            {rows.length > 0 && (
              <button className="btn primary" onClick={runImport} disabled={busy}>
                {busy ? `Importing ${progress}/${rows.length}…` : `Import ${rows.length}`}
              </button>
            )}
            <button className="btn" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}

      {finished && (
        <>
          <p>
            <b>{added}</b> added
            {failures.length > 0 && `, ${failures.length} failed:`}
          </p>
          {failures.map((f, i) => (
            <p key={i} className="error">
              {f}
            </p>
          ))}
          <button className="btn primary" onClick={onDone}>
            Done
          </button>
        </>
      )}
    </div>
  );
}
