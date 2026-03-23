const axios = require("axios");
const https = require("https");

// ===== CONFIG =====
const DELAY_BETWEEN_SEARCHES = 8000; // 8 sec
const DELAY_BETWEEN_CYCLES = 15000; // 15 sec
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
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-GB,en;q=0.9",
    "Referer": "https://www.vinted.co.uk/",
    "Origin": "https://www.vinted.co.uk"
  }
});

// ===== STATE =====
let seen = new Set();

// ===== HELPERS =====
const sleep = ms => new Promise(r => setTimeout(r, ms));

const rareWords = ["rare","vintage","y2k","og","archive"];

function isRare(title) {
  return rareWords.some(w => title.toLowerCase().includes(w));
}

async function fetch(url) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await client.get(url);
      return res.data;
    } catch {
      await sleep(500 + Math.random() * 1000);
    }
  }
  return null;
}

// ===== DISCORD =====
async function send(item, search, price) {
  if (!search.webhook) return;

  const goodDeal = price <= search.maxPrice * 0.5;

  try {
    await axios.post(search.webhook, {
      embeds: [{
        title: `${goodDeal ? "🚨 DEAL" : "New"} — ${item.title}`,
        url: `https://www.vinted.co.uk/items/${item.id}`,
        description: `💰 £${price}`,
        image: { url: item.photo?.url || null }
      }]
    });
  } catch (err) {
    console.log("Discord error");
  }
}

// ===== CORE =====
async function check(search) {
  const url = `https://www.vinted.co.uk/api/v2/catalog/items?search_text=${encodeURIComponent(search.query)}&order=newest_first&currency=GBP`;

  const data = await fetch(url);
  if (!data?.items) return;

  for (const item of data.items.slice(0, 3)) {
    if (!item?.id || seen.has(item.id)) continue;

    seen.add(item.id);

    const price = parseFloat(item.price?.amount || item.price);
    if (!price) continue;

    if (price <= search.maxPrice || isRare(item.title)) {
      await send(item, search, price);
    }
  }
}

// ===== LOOP =====
async function run() {
  console.log("Sniper started...");

  while (true) {
    for (const search of searches) {
      console.log("checking", search.name);
      await check(search);

      // jitter = anti-ban
      await sleep(DELAY_BETWEEN_SEARCHES + Math.random() * 4000);
    }

    await sleep(DELAY_BETWEEN_CYCLES);
  }
}

run();

setInterval(() => {}, 1000);
