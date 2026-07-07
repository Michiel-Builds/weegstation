#!/usr/bin/env node
/** @deprecated Gebruik: npm run release (scripts/release.mjs) */
import { execSync } from "child_process";
import { PATHS } from "./release-config.mjs";

execSync("node scripts/release.mjs", { stdio: "inherit", cwd: PATHS.root });
