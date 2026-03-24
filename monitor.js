import axios from "axios";

const seen = new Set();

const searches = [
  { name: "Nike", query: "nike", maxPrice: 999, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 999, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 999, webhook: process.env.WEBHOOK_SUPREME }
];

async function fetchItems(search) {
  try {
    const url =
      "https://api.allorigins.win/raw?url=" +
      encodeURIComponent(
        `https://www.vinted.co.uk/api/v2/catalog/items?search_text=${search.query}&order=newest_first&per_page=50`
      );

    const res = await axios.get(url, { timeout: 20000 });

    if (!res.data || !res.data.catalog_items) {
      console.log("No items returned");
      return [];
    }

    return res.data.catalog_items;
  } catch {
    console.log("Fetch failed");
    return [];
  }
}

async function sendToDiscord(item, search) {
  try {
    await axios.post(search.webhook, {
      embeds: [
        {
          title: item.title,
          url: `https://www.vinted.co.uk/items/${item.id}`,
          description: `£${item.price.amount}`,
          image: { url: item.photos?.[0]?.url },
          footer: { text: search.name }
        }
      ]
    });

    console.log("Sent:", item.title);
  } catch {
    console.log("Discord error");
  }
}

async function check(search) {
  console.log("Checking", search.name);

  const items = await fetchItems(search);

  if (!items.length) return;

  console.log("Items:", items.length);

  for (const item of items.slice(0, 20)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const price = Number(item.price?.amount || 0);

    if (price <= search.maxPrice) {
      await sendToDiscord(item, search);
    }
  }
}

async function start() {
  console.log("Monitor started");

  while (true) {
    for (const search of searches) {
      await check(search);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

start();
