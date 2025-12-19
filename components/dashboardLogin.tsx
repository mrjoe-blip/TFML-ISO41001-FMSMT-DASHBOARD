import React, { useState } from "react";

function DashboardLogin() {
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

      {data && (
        <div>
          <h2>Welcome {data.respondentName}</h2>
          <p>Maturity Level: {data.aiMaturityLevel}</p>
          {/* Render charts here */}
        </div>
      )}
    </div>
  );
}

export default DashboardLogin;
