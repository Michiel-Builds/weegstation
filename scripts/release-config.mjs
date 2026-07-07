import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const REPO = "Michiel-Builds/weegstation";

export const PATHS = {
  root,
  viteOut: join(root, "dist"),
  electronOut: join(root, "release", "electron-dist"),
  weegserverZip: join(root, "release", "Weegserver.zip"),
  verifyDownload: join(root, "release", "_verify-download"),
};

export function readVersion() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  return pkg.version;
}

export function exeName(version = readVersion()) {
  return `WeegStation-Setup-${version}.exe`;
}

export function tag(version = readVersion()) {
  return `v${version}`;
}

export function installerPaths(version = readVersion()) {
  const name = exeName(version);
  const dir = PATHS.electronOut;
  return {
    exe: join(dir, name),
    blockmap: join(dir, `${name}.blockmap`),
    latestYml: join(dir, "latest.yml"),
  };
}
