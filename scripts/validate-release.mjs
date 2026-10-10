import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const manifest = json("manifest.json");
const pkg = json("package.json");
const lock = json("package-lock.json");
const versions = json("versions.json");
const version = manifest.version;
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

assert.match(version, semver, "Manifest version must be x.y.z without a prefix");
assert.match(manifest.minAppVersion, semver, "minAppVersion must be x.y.z");
assert.equal(pkg.version, version, "Package and manifest versions differ");
assert.equal(lock.version, version, "Lockfile and manifest versions differ");
assert.equal(lock.packages[""].version, version, "Lockfile root version differs");
assert.equal(versions[version], manifest.minAppVersion, "Missing or inconsistent versions.json entry");
assert.equal(typeof manifest.isDesktopOnly, "boolean", "Missing platform declaration");
for (const field of ["id", "name", "description", "author"]) {
  assert.equal(typeof manifest[field], "string", `Missing manifest ${field}`);
  assert.ok(manifest[field].trim(), `Empty manifest ${field}`);
}
assert.match(manifest.id, /^[a-z]+(?:-[a-z]+)*$/, "Invalid plugin id");
assert.ok(!manifest.id.includes("obsidian") && !manifest.id.endsWith("plugin"), "Invalid plugin id");
if (process.env.RELEASE_TAG) {
  assert.equal(process.env.RELEASE_TAG, version, "Release tag must exactly match manifest version");
}
for (const file of ["main.js", "manifest.json", "styles.css", "versions.json", `docs/releases/${version}.md`]) {
  assert.ok(statSync(file).isFile() && statSync(file).size > 0, `Missing or empty release file: ${file}`);
}
console.log(`Release ${version} validated: metadata, tag, notes, and four assets are consistent.`);
