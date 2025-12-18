export default async function handler(req, res) {
  const { id } = req.query;
  const gasUrl = `
https://script.google.com/macros/s/AKfycby2_cbbyl2I3hutAgqt6k7D6lS-U3NW0u1v4dyruiTiKqpRCwReq8JhFCnGHkdXjvBu/exec?id=${id}`;
  
  try {
    const response = await fetch(gasUrl);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy error: " + err.toString() });
  }
}
