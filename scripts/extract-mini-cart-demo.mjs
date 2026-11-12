import fs from "fs";

fs.mkdirSync("app/modules/miniCart/demo", { recursive: true });

const html = fs.readFileSync("mini-korzinka/preview.html", "utf8");
const match = html.match(/id="preparaty-catalog">\s*([\s\S]*?)<\/script>/);
if (!match) throw new Error("preparaty-catalog not found");

const catalog = JSON.parse(match[1]);
fs.writeFileSync(
  "app/modules/miniCart/demo/k26Catalog.json",
  JSON.stringify(catalog, null, 2),
);
fs.copyFileSync(
  "mini-korzinka/data/shell-tabs.json",
  "app/modules/miniCart/demo/shellTabs.json",
);
fs.copyFileSync(
  "mini-korzinka/data/trades.json",
  "app/modules/miniCart/demo/trades.json",
);
fs.copyFileSync(
  "mini-korzinka/data/interactions.json",
  "app/modules/miniCart/demo/interactions.json",
);

console.log({
  diagnosis: catalog.diagnosis,
  tabs: catalog.tabs?.length,
  items: catalog.items?.length,
});
