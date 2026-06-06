import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import pngToIco from "png-to-ico";

mkdirSync("build", { recursive: true });

const svg = readFileSync("icon.svg");

const png256 = await sharp(svg).resize(256, 256).png().toBuffer();
writeFileSync("icon.png", png256);
writeFileSync("build/icon.png", png256);
console.log("OK icon.png (256x256)");

const png512 = await sharp(svg).resize(512, 512).png().toBuffer();
writeFileSync("build/icon-512.png", png512);
console.log("OK build/icon-512.png (512x512)");

const ico = await pngToIco([png256]);
writeFileSync("build/icon.ico", ico);
console.log("OK build/icon.ico");
