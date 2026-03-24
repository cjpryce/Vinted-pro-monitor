import axios from "axios";

const seen = new Set();
let cookie = null;

const searches = [
  { name: "Nike", query: "nike", maxPrice: 999, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 999, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 999, webhook: process.env.WEBHOOK_SUPREME }
];

async function refreshSession() {
  try {
    const res = await axios.get("https://www.vinted.co.uk/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36"
      }
    });

    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      cookie = setCookie.map(c => c.split(";")[0]).join("; ");
      console.log("Session refreshed");
    }
  } catch {
    console.log("Session refresh failed");
  }
}

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
          Cookie: cookie,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          Accept: "application/json",
          Referer: "https://www.vinted.co.uk/",
          "Accept-Language": "en-GB,en;q=0.9"
        },
        timeout: 20000
      }
    );

    if (!res.data || !res.data.catalog_items) return [];
    return res.data.catalog_items;
  } catch {
    console.log("Blocked attempt — refreshing session");
    await refreshSession();
    return [];
  }
}

async function sendToDiscord(item, search, price) {
  if (!search.webhook) return;

  try {
    await axios.post(search.webhook, {
      embeds: [
        {
          title: item.title,
          url: `https://www.vinted.co.uk/items/${item.id}`,
          description: `£${price}`,
          image: {
            url: item.photos?.[0]?.url
          },
          footer: {
            text: search.name
          }
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
    console.log("No items returned");
    return;
  }

  console.log("Items found:", items.length);

  for (const item of items.slice(0, 20)) {
    if (!item?.id) continue;
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
  console.log("Starting monitor...");

  await refreshSession();

  while (true) {
    for (const search of searches) {
      await check(search);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

start();
