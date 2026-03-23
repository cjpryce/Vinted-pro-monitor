import axios from "axios";

const seen = new Set();

const searches = [
  { name: "Nike", query: "nike", maxPrice: 999, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 999, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 999, webhook: process.env.WEBHOOK_SUPREME }
];

const client = axios.create({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-GB,en;q=0.9",
    Referer: "https://www.vinted.co.uk/",
    Origin: "https://www.vinted.co.uk"
  }
});

async function fetchItems(search) {
  try {
    const url =
      `https://www.vinted.co.uk/api/v2/catalog/items` +
      `?search_text=${encodeURIComponent(search.query)}` +
      `&order=newest_first` +
      `&per_page=50` +
      `&page=1`;

    const res = await client.get(url);

    if (!res.data || !res.data.catalog_items) return [];

    return res.data.catalog_items;
  } catch (err) {
    console.log("Fetch failed");
    return [];
  }
}

async function sendToDiscord(item, search, price) {
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
          fields: [
            {
              name: "Brand Monitor",
              value: search.name
            }
          ]
        }
      ]
    });

    console.log("Sent item:", item.title);
  } catch (err) {
    console.log("Discord error");
  }
}

async function check(search) {
  console.log("Checking", search.name);

  const items = await fetchItems(search);

  if (!items.length) {
    console.log("Empty response from Vinted");
    return;
  }

  console.log("Items found:", items.length);

  for (const item of items) {
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
  console.log("Monitor started");

  while (true) {
    for (const search of searches) {
      await check(search);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

start();
