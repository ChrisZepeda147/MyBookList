import sharp from "sharp";
import fs from "fs";

const src = "public/reading-session-reference.png";
const out = "public/reading-session-bg.jpg";

/** Open book pages only — above the Restart / Start button row. */
await sharp(src)
  .extract({ left: 48, top: 298, width: 928, height: 92 })
  .resize(1856, 184, { kernel: sharp.kernel.lanczos3 })
  .sharpen({ sigma: 0.9, m1: 0.5, m2: 2 })
  .jpeg({ quality: 90 })
  .toFile(out);

console.log("Wrote", out, fs.statSync(out).size, "bytes");
