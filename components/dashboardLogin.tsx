import React, { useState } from "react";

interface DashboardLoginProps {
  onSuccess: (data: any) => void;
}

const DashboardLogin: React.FC<DashboardLoginProps> = ({ onSuccess }) => {
  const [code, setCode] = useState("");   // <-- code is defined here
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/fetchReport?id=${code}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        onSuccess(json); // pass data back to App
      }
    } catch (err) {
      setError("Error fetching report");
      console.error(err);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 4‑char code"
        />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default DashboardLogin;
