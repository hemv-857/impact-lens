// Fetch all field-media sample images via z-ai image-search and download locally.
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const OUT_DIR = path.join(process.cwd(), "public", "field-media");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SPECS: { file: string; query: string }[] = [
  { file: "reforest_before.jpg", query: "barren eroded hillside cracked dry soil deforestation before" },
  { file: "reforest_after.jpg", query: "young tree saplings planted reforestation hillside rows green" },
  { file: "solar_install.jpg", query: "rooftop solar panel installation rural community building workers" },
  { file: "water_well.jpg", query: "villagers hand water pump well clean water Africa" },
  { file: "garden_before.jpg", query: "abandoned urban empty lot concrete trash overgrown" },
  { file: "garden_after.jpg", query: "thriving urban community garden raised vegetable beds volunteers" },
  { file: "beach_cleanup.jpg", query: "beach cleanup volunteers plastic waste collection ocean" },
  { file: "wind_farm.jpg", query: "wind turbines renewable energy green hills landscape sunset" },
  { file: "school_classroom.jpg", query: "rural school classroom children learning wooden desks developing country" },
  { file: "irrigation_training.jpg", query: "farmers drip irrigation training sustainable agriculture field" },
  { file: "mangrove_restore.jpg", query: "mangrove restoration planting seedlings coastal wetland conservation" },
  { file: "women_coop.jpg", query: "women cooperative making woven baskets crafts workshop rural" },
];

function download(url: string, dest: string): Promise<number> {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    const req = lib.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        download(res.headers.location, dest).then(resolve);
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(fs.statSync(dest).size)));
    });
    req.on("error", () => {
      try { fs.unlinkSync(dest); } catch {}
      resolve(0);
    });
    req.setTimeout(30000, () => req.destroy());
  });
}

async function main() {
  let ok = 0;
  for (const spec of SPECS) {
    const dest = path.join(OUT_DIR, spec.file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
      console.log(`SKIP ${spec.file} (already exists)`);
      ok++;
      continue;
    }
    try {
      console.log(`SEARCH ${spec.file} <- "${spec.query}"`);
      const stdout = execSync(`z-ai image-search -q "${spec.query.replace(/"/g, '\\"')}" --count 3 --gl us --no-rank`, { timeout: 120000, encoding: "utf8" });
      // Extract the JSON object from stdout (skip spinner/log lines)
      const jsonStart = stdout.indexOf("{");
      const jsonEnd = stdout.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("no JSON in stdout");
      const data = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
      const results = data.results || [];
      let saved = 0;
      for (const r of results) {
        if (!r.original_url) continue;
        const size = await download(r.original_url, dest);
        if (size > 5000) { saved = size; break; }
      }
      if (saved > 0) {
        console.log(`OK    ${spec.file} (${saved} bytes)`);
        ok++;
      } else {
        console.log(`FAIL  ${spec.file} (no usable result)`);
      }
    } catch (e) {
      console.log(`ERR   ${spec.file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`\nDONE: ${ok}/${SPECS.length} images fetched.`);
}

main();
