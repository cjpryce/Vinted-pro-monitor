import axios from "axios";

const seen = new Set();

const searches = [
  { name: "Nike", query: "nike hoodie", maxPrice: 70, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy hoodie", maxPrice: 70, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme hoodie", maxPrice: 70, webhook: process.env.WEBHOOK_SUPREME }
];

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-GB,en;q=0.9"
};

async function fetchItems(search) {
  try {
    const url =
      "https://www.vinted.co.uk/catalog?search_text=" +
      encodeURIComponent(search.query);

    const res = await axios.get(url, { headers });

    const match = res.data.match(/window.__INITIAL_STATE__ = (.*);/);

    if (!match) {
      console.log("Blocked by Vinted");
      return [];
    }

    const data = JSON.parse(match[1]);

    const items = data.catalog.items;

    return items || [];
  } catch {
    console.log("Fetch failed");
    return [];
  }
}

async function send(item, search) {
  try {
    await axios.post(search.webhook, {
      embeds: [
        {
          title: item.title,
          url: `https://www.vinted.co.uk/items/${item.id}`,
          description: `£${item.price}`,
          image: { url: item.photo?.url }
        }
      ]
    });

    console.log("Sent:", item.title);
  } catch {
    console.log("Discord failed");
  }
}

async function check(search) {
  console.log("Checking", search.name);

  const items = await fetchItems(search);

  if (!items.length) {
    console.log("No items found");
    return;
  }

  console.log("Items:", items.length);

  for (const item of items.slice(0, 20)) {
    if (seen.has(item.id)) continue;

    seen.add(item.id);

    const price = Number(item.price || 0);

    if (price <= search.maxPrice) {
      await send(item, search);
    }
  }
}

async function start() {
  console.log("Render Vinted Monitor Started");

  while (true) {
    for (const search of searches) {
      await check(search);
      await new Promise(r => setTimeout(r, 20000));
    }
  }
}

start();
