fetch(`/api/fetchReport?id=${code}`)
  .then(res => res.json())
  .then(data => {
    // handle the JSON response
    console.log(data);
  })
  .catch(err => console.error("Error fetching report:", err))
