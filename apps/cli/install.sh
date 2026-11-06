#!/bin/sh
# Installs the Logbook CLI as `logbook`.
#
#   curl -fsSL https://raw.githubusercontent.com/prajwal-hebbar-07/tracker-mobile/main/apps/cli/install.sh | sh
#   sh apps/cli/install.sh apps/cli/dist/logbook.mjs     # install a local build instead
#
# The tool lives in ~/.local/share/logbook-cli and is linked from ~/.local/bin. `logbook update` replaces it later.
set -eu

repo=prajwal-hebbar-07/tracker-mobile
dir="${LOGBOOK_INSTALL_DIR:-$HOME/.local/share/logbook-cli}"
bin="${LOGBOOK_BIN_DIR:-$HOME/.local/bin}"

fail() {
  echo "logbook: $1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "needs Node.js 22 or newer: https://nodejs.org"
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || fail "needs Node.js 22 or newer (found $(node -v))"

mkdir -p "$dir" "$bin"
tmp="$dir/logbook.mjs.download"

if [ $# -gt 0 ]; then
  [ -f "$1" ] || fail "no file at $1"
  cp "$1" "$tmp"
else
  # The newest cli-v* release; the repo's other releases are APKs. Prints "<version> <url> <sha256 or ->".
  release=$(curl -fsSL -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$repo/releases?per_page=50" | node -e '
    let text = ""
    process.stdin.on("data", (chunk) => (text += chunk)).on("end", () => {
      const key = (v) => v.split(".").map(Number).reduce((sum, part) => sum * 1000 + part, 0)
      const found = JSON.parse(text)
        .filter((r) => !r.draft && !r.prerelease && /^cli-v\d+\.\d+\.\d+$/.test(r.tag_name))
        .map((r) => ({ version: r.tag_name.slice(5), asset: r.assets.find((a) => a.name === "logbook.mjs") }))
        .filter((r) => r.asset)
        .sort((a, b) => key(b.version) - key(a.version))[0]
      if (!found) process.exit(3)
      const digest = (found.asset.digest || "").replace(/^sha256:/, "") || "-"
      console.log(found.version, found.asset.browser_download_url, digest)
    })') || fail "no CLI release on GitHub yet; build one with npm run cli:install from the repo"
  read -r version url digest <<EOF
$release
EOF
  echo "Downloading Logbook CLI $version…"
  curl -fsSL "$url" -o "$tmp"
  if [ "$digest" != "-" ]; then
    actual=$(node -e 'process.stdout.write(require("crypto").createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"))' "$tmp")
    [ "$actual" = "$digest" ] || { rm -f "$tmp"; fail "download does not match the release checksum; nothing was installed"; }
  fi
fi

chmod 755 "$tmp"
mv "$tmp" "$dir/logbook.mjs"
ln -sf "$dir/logbook.mjs" "$bin/logbook"
echo "Installed logbook $(LOGBOOK_NO_UPDATE_CHECK=1 "$dir/logbook.mjs" version) → $bin/logbook"

case ":$PATH:" in
  *":$bin:"*) echo "Run: logbook" ;;
  *) echo "Add $bin to your PATH, for example: echo 'export PATH=\"$bin:\$PATH\"' >> ~/.zshrc" ;;
esac
