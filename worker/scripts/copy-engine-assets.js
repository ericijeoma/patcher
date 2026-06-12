const fs = require("fs");
const path = require("path");

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

copy(path.join("..", "pkg-web", "patcher_bg.wasm"), path.join("public", "engine.wasm"));
copy(path.join("..", "pkg-web", "patcher.js"), path.join("public", "engine.js"));

console.log("Copied engine assets.");
