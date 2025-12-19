import React, { useState } from "react";
import Dashboard from "./Dashboard"; // adjust if your dashboard file is named differently

function DashboardLogin() {
  // Define code as state so it's available
  const [code, setCode] = useState("");
  const [data, setData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/fetchReport?id=${code}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching report:", err);
    }
  };

  // If we already have data, show the dashboard
  if (data && !data.error) {
    return <Dashboard report={data} />;
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Enter 4‑char code"
        />
        <button type="submit">Login</button>
      </form>

      {data?.error && <p style={{ color: "red" }}>{data.error}</p>}
    </div>
  );
}

export default DashboardLogin;
