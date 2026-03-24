import axios from "axios";

const seen = new Set();
let cookie = "";

const searches = [
  { name: "Nike", query: "nike", maxPrice: 999, webhook: process.env.WEBHOOK_NIKE },
  { name: "Stussy", query: "stussy", maxPrice: 999, webhook: process.env.WEBHOOK_STUSSY },
  { name: "Supreme", query: "supreme", maxPrice: 999, webhook: process.env.WEBHOOK_SUPREME }
];

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  "accept-language": "en-GB,en;q=0.9",
  accept: "application/json, text/plain, */*"
};

async function getSession() {
  try {
    const res = await axios.get("https://www.vinted.co.uk/", {
      headers
    });

    const cookies = res.headers["set-cookie"];
    if (cookies) {
      cookie = cookies.map(c => c.split(";")[0]).join("; ");
      console.log("New session created");
    }
  } catch {
    console.log("Session failed");
  }
}

async function fetch(search) {
  try {
    const res = await axios.get(
      `https://www.vinted.co.uk/api/v2/catalog/items?search_text=${search.query}&order=newest_first&per_page=50`,
      {
        headers: {
          ...headers,
          cookie
        },
        timeout: 15000
      }
    );

    return res.data?.catalog_items || [];
  } catch {
    console.log("Blocked or failed");
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
          description: `£${item.price.amount}`,
          image: { url: item.photos?.[0]?.url }
        }
      ]
    });

    console.log("Sent to Discord:", item.title);
  } catch {
    console.log("Webhook failed");
  }
}

async function monitor() {
  await getSession();

  while (true) {
    for (const search of searches) {
      console.log("Checking", search.name);

      const items = await fetch(search);

      if (!items.length) {
        console.log("No items returned");
        await getSession();
        continue;
      }

      for (const item of items.slice(0, 20)) {
        if (seen.has(item.id)) continue;

        seen.add(item.id);

        const price = Number(item.price?.amount || 0);

        if (price <= search.maxPrice) {
          await send(item, search);
        }
      }

      await new Promise(r => setTimeout(r, 8000));
    }
  }
}

monitor();
