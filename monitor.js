import axios from "axios";

const seen = new Set();
let cookie = null;
let lastSessionRefresh = 0;

const SESSION_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const REQUEST_DELAY = 15000; // 15 seconds (important for avoiding blocks)

const searches = [
  { name: "Nike", query: "nike", maxPrice: 70, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 70, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 70, webhook: process.env.WEBHOOK_SUPREME }
];

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  "accept-language": "en-GB,en;q=0.9",
  accept: "application/json, text/plain, */*"
};

async function refreshSession() {
  try {
    const res = await axios.get("https://www.vinted.co.uk/", {
      headers
    });

    const cookies = res.headers["set-cookie"];
    if (cookies) {
      cookie = cookies.map(c => c.split(";")[0]).join("; ");
      lastSessionRefresh = Date.now();
      console.log("Session refreshed");
    }
  } catch {
    console.log("Session refresh failed");
  }
}

async function fetchItems(search) {
  try {
    if (!cookie || Date.now() - lastSessionRefresh > SESSION_REFRESH_INTERVAL) {
      await refreshSession();
    }

    const res = await axios.get(
      "https://www.vinted.co.uk/api/v2/catalog/items",
      {
        params: {
          search_text: search.query,
          order: "newest_first",
          per_page: 50
        },
        headers: {
          ...headers,
          cookie
        },
        timeout: 20000
      }
    );

    if (!res.data || !res.data.catalog_items) {
      console.log("No items returned (possible soft block)");
      return [];
    }

    return res.data.catalog_items;
  } catch (err) {
    console.log("Fetch error (possible block)");
    return [];
  }
}

async function sendToDiscord(item, search) {
  if (!search.webhook) return;

  try {
    await axios.post(search.webhook, {
      embeds: [
        {
          title: item.title,
          url: `https://www.vinted.co.uk/items/${item.id}`,
          description: `£${item.price.amount}`,
          image: { url: item.photos?.[0]?.url },
          footer: { text: `Vinted Monitor • ${search.name}` }
        }
      ]
    });

    console.log("Sent:", item.title);
  } catch {
    console.log("Discord send failed");
  }
}

async function check(search) {
  console.log("Checking:", search.name);

  const items = await fetchItems(search);

  if (!items.length) return;

  console.log("Items found:", items.length);

  for (const item of items.slice(0, 20)) {
    if (!item?.id) continue;
    if (seen.has(item.id)) continue;

    seen.add(item.id);

    const price = Number(item.price?.amount || 0);

    if (price <= search.maxPrice) {
      await sendToDiscord(item, search);
    }
  }
}

async function start() {
  console.log("Render Vinted Monitor Started");

  await refreshSession();

  while (true) {
    for (const search of searches) {
      await check(search);
      await new Promise(r => setTimeout(r, REQUEST_DELAY));
    }
  }
}

start();
