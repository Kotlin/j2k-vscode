import "dotenv/config";

import { Octokit } from "@octokit/rest";
import { execFile } from "child_process";
import { promisify } from "util";
import { basename } from "path";
import { createReadStream, readFileSync, statSync } from "fs";

const exec = promisify(execFile);

const owner = "Kotlin";
const repo = "j2k-vscode";
const token = process.env.GITHUB_TOKEN;

const version = process.argv[2];
console.log(`new version: ${process.argv[2]}`);

// bump version
await exec("npm", [
  "version", version,
  "--no-git-tag-version",
  "--allow-same-version"
]);

// build vsix file
await exec("npx", [
  "@vscode/vsce",
  "package"
]); // outputs to j2k-vscode-${version}.vsix

// git history preserve
await exec("git", [
  "add", "package.json", "package-lock.json"
]);
await exec("git", [
  "commit", "-m", `create release for version ${version}`
]);
await exec("git", [
  "tag", "-a", `v${version}`, "-m", `Release v${version}`
]);
await exec("git", [
  "push",
  "origin", "main",
  "--tags"
]);

// create github release
const octokit = new Octokit({ auth: token });
const release = await octokit.repos.createRelease({
  owner: owner,
  repo: repo,
  tag_name: `v${version}`,
  name: `v${version} (pre-release)`,
  prerelease: true,
});

const data = readFileSync(`j2k-vscode-${version}.vsix`, { encoding: "binary" });
const size = statSync(`j2k-vscode-${version}.vsix`).size;
await octokit.repos.uploadReleaseAsset({
  owner: owner,
  repo: repo,
  release_id: release.data.id,
  name: `j2k-vscode-${version}.vsix`,
  headers: {
    "content-type": "application/octet-stream",
    "content-length": size.toString()
  },
  data: data
});

console.log("released the current vsix");
