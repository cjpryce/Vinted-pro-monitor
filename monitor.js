import axios from "axios";

const seen = new Set();

// Searches
const searches = [
  { name: "Nike", query: "nike", maxPrice: 999, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 999, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 999, webhook: process.env.WEBHOOK_SUPREME }
];

// Axios client
const client = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://www.vinted.co.uk/"
  }
});

async function fetchItems(url) {
  try {
    const res = await client.get(url);
    return res.data;
  } catch (err) {
    console.log("Fetch retry...");
    return null;
  }
}

async function sendToDiscord(item, search, price) {
  if (!search.webhook) return;

  const message = {
    embeds: [
      {
        title: item.title,
        url: `https://www.vinted.co.uk/items/${item.id}`,
        description: `£${price}`,
        thumbnail: {
          url: item.photo?.url || item.photos?.[0]?.url
        },
        footer: {
          text: search.name
        }
      }
    ]
  };

  try {
    await axios.post(search.webhook, message);
    console.log("Sent to Discord:", item.title);
  } catch (err) {
    console.log("Discord error");
  }
}

async function check(search) {
  console.log("Checking", search.name);

  const url = `https://www.vinted.co.uk/api/v2/catalog/items?search_text=${encodeURIComponent(
    search.query
  )}&order=newest_first&per_page=50`;

  const data = await fetchItems(url);

  if (!data || !data.catalog_items) {
    console.log("No items returned");
    return;
  }

  if (data.catalog_items.length === 0) {
    console.log("No items returned");
    return;
  }

  console.log("Items found:", data.catalog_items.length);

  for (const item of data.catalog_items.slice(0, 20)) {
    if (!item?.id) continue;
    if (seen.has(item.id)) continue;

    seen.add(item.id);

    const price =
      Number(item.price?.amount) ||
      Number(item.total_item_price?.amount) ||
      0;

    if (!price) continue;

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
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

start();
