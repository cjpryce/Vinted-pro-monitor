const axios = require("axios");

const CHECK_INTERVAL = 90000; // fast but still safe

const searches = [

{
name: "Nike Air Max 95",
webhook: "https://discord.com/api/webhooks/1485433585090433116/XPF5SdTRxeRShY46RH9enr0u0W0brCwU7Rejj5C0W2DZ43czMBZ8iudSGDPL00It5p86",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=air+max+95&order=newest_first&currency=GBP",
maxPrice: 130
},

{
name: "Nike",
webhook: "https://discord.com/api/webhooks/1485428077327548538/TFeRDSpuDS7gnP5JWhE-svPIP7OOpLRemfb8Lczay--uFPWBbQaMb_6A19lyX1PCn4GW",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=nike&order=newest_first&currency=GBP",
maxPrice: 70
},

{
name: "Stussy",
webhook: "https://discord.com/api/webhooks/1485431524043260035/tn4-hRa1PvRDHoVWUUbxST1HFgrLPTu1gyKx-xTcv2w3i8rj2h01yC-b8zeSP_MbylUV",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=stussy&order=newest_first&currency=GBP",
maxPrice: 110
},

{
name: "North Face",
webhook: "https://discord.com/api/webhooks/1485431037898133564/v343u2iJ9iHd40AsfBSl2N96ER94EtK_HQIK92MosmsKAhyOZPojyTpdEIKizGlKm91e",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=north+face&order=newest_first&currency=GBP",
maxPrice: 140
},

{
name: "Essentials",
webhook: "https://discord.com/api/webhooks/1485431729878470698/v9WOL8Jd5n1n8Gvd5IqwtRLsa7-q-Zn3yVJlB1MHNrfHa-3bmtyZWgN5FJ-jtXe02-sN",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=essentials&order=newest_first&currency=GBP",
maxPrice: 140
},

{
name: "Corteiz",
webhook: "https://discord.com/api/webhooks/1485432248743235584/WVF1g9keUQ91Ttm3p3vx0eyzkbLDoTJk0_mgZHS8pvYKDJPFqbweUl4BzSgkNSUcXC6f",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=corteiz&order=newest_first&currency=GBP",
maxPrice: 170
},

{
name: "Supreme",
webhook: "https://discord.com/api/webhooks/1485432462162133153/Hf9YL9SLVqihBD2fm2pQa9yjgRTNUIsi5H7sik4VYQ_l_stuEtulihLAbfmfRXc6EKfK",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=supreme&order=newest_first&currency=GBP",
maxPrice: 170
},

{
name: "Nike Trainers",
webhook: "https://discord.com/api/webhooks/1485432769059225721/D6qqgoz9FYA1067jz8JAIJqeWtSzET6t7OyK5wwAM7Xy1xszTK2wM1sxWl5sP3kotUHg",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=nike+trainers&order=newest_first&currency=GBP",
maxPrice: 120
},

{
name: "Asics Trainers",
webhook: "https://discord.com/api/webhooks/1485432951012593674/YCpBVBt5mITGsWUJOcLnQInEoYyiM6DEzX4fZJxwnLbtItuq--3Xb4axwdTZsE0whXyS",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=asics&order=newest_first&currency=GBP",
maxPrice: 120
},

{
name: "New Balance Trainers",
webhook: "https://discord.com/api/webhooks/1485433137394880618/5ofwdRqcYRVBb75S0vUIfFq0c_H5jLKuU7_abvYt-cBG6hvA2SmAGY6SKqOGxTdsnDIx",
url: "https://www.vinted.co.uk/api/v2/catalog/items?search_text=new+balance&order=newest_first&currency=GBP",
maxPrice: 120
}

];

const rareKeywords = [
"rare",
"vintage",
"y2k",
"2000s",
"og",
"deadstock",
"archive"
];

let seen = new Set();

function rareItem(title) {
return rareKeywords.some(word =>
title.toLowerCase().includes(word)
);
}

async function sendToDiscord(item, search) {

const steal = item.price <= search.maxPrice * 0.45;

const tag = steal ? "🚨 BIG DEAL FOUND" : "New Listing";

await axios.post(search.webhook, {
embeds: [
{
title: `${tag} — ${item.title}`,
url: `https://www.vinted.co.uk/items/${item.id}`,
description:
`💰 Price: £${item.price}\n` +
`📦 Category: ${search.name}`,
image: {
url: item.photo && item.photo.url ? item.photo.url : null
}
}
]
});
}

async function checkSearch(search) {

const res = await axios.get(search.url, {
headers: { "User-Agent": "Mozilla/5.0" }
});

const items = res.data.items.slice(0, 4);

for (const item of items) {

  if (!item || !item.id || !item.url) continue;

if (seen.has(item.id)) continue;
seen.add(item.id);

if (item.price <= search.maxPrice || rareItem(item.title)) {
await sendToDiscord(item, search);
}

}

}

async function runMonitor() {

for (const search of searches) {

await checkSearch(search);

await new Promise(r =>
setTimeout(r, Math.random() * 15000)
);

}

}

setInterval(runMonitor, CHECK_INTERVAL);
runMonitor();
