import * as THREE from "three";
import type { AlbumArtKey } from "./assets";

/** Procedural walnut wood grain — no external image assets. */
export function createWoodGrainTexture(
  baseHue = "#4a2c1a",
  seed = 1,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const base = new THREE.Color(baseHue);

  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 140; i++) {
    const y = ((i * 37 * seed) % size) + Math.sin(i * 0.4) * 8;
    const shade = 0.75 + (i % 5) * 0.04;
    const c = base.clone().multiplyScalar(shade);
    ctx.strokeStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.22)`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 24) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i + seed) * 3);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 18; i++) {
    const x = (i * 97 * seed) % size;
    const g = ctx.createLinearGradient(x, 0, x + 40, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 40, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Spine label texture from title + color. */
export function createSpineLabelTexture(
  title: string,
  spineColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = spineColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, "rgba(0,0,0,0.45)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.08)");
  grad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height - 24);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(255,248,235,0.92)";
  ctx.font = "500 22px Georgia, serif";
  ctx.textAlign = "center";
  const label = title.length > 42 ? `${title.slice(0, 40)}…` : title;
  ctx.fillText(label, canvas.height / 2 - 20, 6);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}


/** Iconic album sleeve art (high-detail canvas — no broken hotlinks). */
export function createIconicAlbumTexture(key: AlbumArtKey): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  switch (key) {
    case "abbey-road": {
      ctx.fillStyle = "#6b6b66";
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#ece8df" : "#2a2a2a";
        ctx.fillRect(40, 180 + i * 28, 432, 14);
      }
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(60, 120, 392, 50);
      ctx.fillStyle = "#f0ece4";
      ctx.font = "bold 28px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("The Beatles", 256, 95);
      ctx.font = "22px Georgia, serif";
      ctx.fillText("Abbey Road", 256, 155);
      break;
    }
    case "dark-side": {
      const g = ctx.createLinearGradient(0, 0, 512, 512);
      g.addColorStop(0, "#0a0a12");
      g.addColorStop(1, "#1a1a28");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      ctx.beginPath();
      ctx.arc(380, 130, 55, 0, Math.PI * 2);
      ctx.fillStyle = "#f5f0e8";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(120, 380);
      ctx.lineTo(200, 280);
      ctx.lineTo(280, 380);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();
      ctx.fillStyle = "#e8e4dc";
      ctx.font = "20px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Pink Floyd", 256, 460);
      break;
    }
    case "zeppelin-iv": {
      ctx.fillStyle = "#6b5a48";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#8a7a68";
      ctx.fillRect(40, 60, 432, 392);
      ctx.fillStyle = "#4a3828";
      ctx.beginPath();
      ctx.ellipse(256, 280, 90, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0ece4";
      ctx.font = "bold 24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Led Zeppelin IV", 256, 440);
      break;
    }
    case "physical-graffiti": {
      ctx.fillStyle = "#8a7a62";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#5a4a38";
      ctx.fillRect(30, 30, 200, 452);
      ctx.fillStyle = "#4a3a28";
      ctx.fillRect(282, 30, 200, 452);
      ctx.fillStyle = "#f0ece4";
      ctx.font = "bold 18px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Physical Graffiti", 256, 480);
      break;
    }
    case "wish-you-were-here": {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#c8c0b8";
      ctx.fillRect(80, 100, 352, 312);
      ctx.fillStyle = "rgba(255,200,100,0.35)";
      ctx.beginPath();
      ctx.arc(256, 260, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0ece4";
      ctx.font = "20px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Wish You Were Here", 256, 460);
      break;
    }
    case "skynyrd": {
      ctx.fillStyle = "#3d2818";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(60, 80, 392, 352);
      ctx.fillStyle = "#f0ece4";
      ctx.font = "bold 22px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Lynyrd Skynyrd", 256, 260);
      ctx.font = "18px Georgia, serif";
      ctx.fillText("Street Survivors", 256, 300);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Black vinyl disc surface with subtle grooves. */
export function createVinylDiscTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  const radGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, size / 2);
  radGrad.addColorStop(0, "#1a1a1a");
  radGrad.addColorStop(0.15, "#0a0a0a");
  radGrad.addColorStop(0.85, "#111111");
  radGrad.addColorStop(1, "#050505");
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, size, size);

  for (let r = 20; r < 120; r += 3) {
    ctx.strokeStyle = `rgba(255,255,255,${0.02 + (r % 9) * 0.004})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#8b3a2a";
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Paper page block for book tops. */
export function createPageBlockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 2) {
    ctx.fillStyle = x % 4 === 0 ? "#ebe4d8" : "#f7f2ea";
    ctx.fillRect(x, 0, 1, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Build spine strip from a full cover texture. */
export function createSpineFromCover(
  cover: THREE.Texture,
  spineColor: string,
  title: string,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  if (cover.image instanceof HTMLImageElement) {
    const w = cover.image.naturalWidth || cover.image.width;
    const h = cover.image.naturalHeight || cover.image.height;
    ctx.drawImage(cover.image, w * 0.42, 0, w * 0.16, h, 0, 0, 96, 512);
  } else {
    ctx.fillStyle = spineColor;
    ctx.fillRect(0, 0, 96, 512);
  }

  const grad = ctx.createLinearGradient(0, 0, 96, 0);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
