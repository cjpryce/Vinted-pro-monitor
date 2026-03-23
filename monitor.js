const axios = require("axios");
const https = require("https");

// ===== CONFIG =====
const DELAY_BETWEEN_SEARCHES = 8000;
const DELAY_BETWEEN_CYCLES = 15000;
const MAX_RETRIES = 2;

// ===== SEARCHES =====
const searches = [
  {
    name: "Nike",
    webhook: process.env.WEBHOOK_NIKE,
    query: "nike",
    maxPrice: 70
  },
  {
    name: "Stussy",
    webhook: process.env.WEBHOOK_STUSSY,
    query: "stussy",
    maxPrice: 110
  },
  {
    name: "Supreme",
    webhook: process.env.WEBHOOK_SUPREME,
    query: "supreme",
    maxPrice: 170
  }
];

// ===== AXIOS CLIENT =====
const client = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-GB,en;q=0.9",
    Referer: "https://www.vinted.co.uk/",
    Origin: "https://www.vinted.co.uk"
  }
});

// ===== STATE =====
let seen = new Set();
let firstRun = true;

// ===== HELPERS =====
const sleep = ms => new Promise(r => setTimeout(r, ms));

const rareWords = ["rare", "vintage", "y2k", "og", "archive"];

function isRare(title = "") {
  return rareWords.some(w => title.toLowerCase().includes(w));
}

async function fetch(url) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await client.get(url);
      return res.data;
    } catch (err) {
      console.log("Fetch retry...");
      await sleep(800 + Math.random() * 1000);
    }
  }
  return null;
}

// ===== DISCORD =====
async function send(item, search, price) {
  if (!search.webhook) {
    console.log(`⚠ Missing webhook for ${search.name}`);
    return;
  }

  const goodDeal = price <= search.maxPrice * 0.5;

  try {
    const res = await axios.post(search.webhook, {
      embeds: [
        {
          title: `${goodDeal ? "🚨 DEAL" : "New"} — ${item.title}`,
          url: `https://www.vinted.co.uk/items/${item.id}`,
          description: `💰 £${price}`,
          image: {
            url: item.photo?.url || null
          }
        }
      ]
    });

    console.log(`Sent to Discord (${search.name})`, res.status);
  } catch (err) {
    console.log(
      "Discord error:",
      err.response?.data || err.message
    );
  }
}

// ===== CORE =====
async function check(search) {
  const url = `https://www.vinted.co.uk/api/v2/catalog/items?search_text=${encodeURIComponent(
    search.query
  )}&order=newest_first&currency=GBP`;

  const data = await fetch(url);
  if (!data?.catalog_items) {
    console.log("No items returned");
    return;
  }

  console.log(`${search.name}: ${data.catalog_items.length} items`);

  for (const item of data.catalog_items.slice(0, 25)) {
    if (!item?.id) continue;

    const price = Number(
      item.price?.amount || item.price || 0
    );

    if (!price) continue;

    // First run protection (prevents spam on deploy)
    if (firstRun) {
      seen.add(item.id);
      continue;
    }

    if (seen.has(item.id)) continue;

    seen.add(item.id);

    if (seen.size > 1000) {
      seen.clear();
      console.log("Seen list cleared");
    }

    if (price <= search.maxPrice || isRare(item.title)) {
      await send(item, search, price);
    }
  }
}

// ===== LOOP =====
async function run() {
  console.log("Sniper started...");

  // Startup check
  for (const search of searches) {
    if (!search.webhook) {
      console.log(`Missing ENV variable for ${search.name}`);
    } else {
      try {
        await axios.post(search.webhook, {
          content: `✅ ${search.name} monitor started`
        });
      } catch {}
    }
  }

  await sleep(3000);
  firstRun = false;

  while (true) {
    for (const search of searches) {
      console.log("Checking", search.name);
      await check(search);

      await sleep(
        DELAY_BETWEEN_SEARCHES + Math.random() * 4000
      );
    }

    await sleep(DELAY_BETWEEN_CYCLES);
  }
}

run();
