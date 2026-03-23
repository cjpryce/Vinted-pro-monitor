import axios from "axios";

const seen = new Set();

const searches = [
  { name: "Nike", query: "nike", maxPrice: 999, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 999, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 999, webhook: process.env.WEBHOOK_SUPREME }
];

async function fetchItems(search) {
  try {
    const res = await axios.get(
      "https://www.vinted.co.uk/api/v2/catalog/items",
      {
        params: {
          search_text: search.query,
          order: "newest_first",
          per_page: 50
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          Accept: "application/json",
          Referer: "https://www.vinted.co.uk/",
          Origin: "https://www.vinted.co.uk",
          "Accept-Language": "en-GB,en;q=0.9",
          "Cache-Control": "no-cache"
        },
        timeout: 20000
      }
    );

    if (!res.data || !res.data.catalog_items) return [];
    return res.data.catalog_items;
  } catch (err) {
    console.log("Blocked by Vinted");
    return [];
  }
}

async function sendToDiscord(item, search, price) {
  if (!search.webhook) return;

  try {
    await axios.post(search.webhook, {
      content: `🔥 ${item.title} - £${price}\nhttps://www.vinted.co.uk/items/${item.id}`
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
    console.log("No items returned");
    return;
  }

  console.log("Items:", items.length);

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const price =
      Number(item.price?.amount) ||
      Number(item.total_item_price?.amount) ||
      0;

    if (price <= search.maxPrice) {
      await sendToDiscord(item, search, price);
    }
  }
}

async function start() {
  console.log("Monitor started");

  while (true) {
    for (const search of searches) {
      await check(search);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

start();
