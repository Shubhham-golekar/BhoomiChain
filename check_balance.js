async function checkBalance() {
  const query = `
    query {
      tokens(where: { owner: { _eq: "mn_addr_preview1y8ruy3ffjr9jkjuegg9nse8z89fxj7ll8g4d59acmg6trwcd7uwqqjdra3" } }) {
        id
        value
      }
    }
  `;

  try {
    const res = await fetch('https://indexer.preview.midnight.network/api/v4/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

checkBalance();
