import sharp from "sharp";
import fs from "fs";

const src = "public/reading-session-reference.png";
const out = "public/reading-session-book-spread.png";

/** Page spread from reference — between author line and Restart row. */
const page = await sharp(src)
  .extract({ left: 112, top: 248, width: 148, height: 118 })
  .resize(296, 236, { kernel: sharp.kernel.lanczos3 })
  .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
  .png()
  .toBuffer();

const mirrored = await sharp(page).flop().png().toBuffer();

await sharp({
  create: {
    width: 592,
    height: 236,
    channels: 3,
    background: { r: 14, g: 12, b: 10 },
  },
})
  .composite([
    { input: page, left: 0, top: 0 },
    { input: mirrored, left: 296, top: 0 },
  ])
  .png({ compressionLevel: 6 })
  .toFile(out);

console.log("Wrote", out, fs.statSync(out).size, "bytes");
