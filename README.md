<<<<<<< HEAD
<h1 align="center">ghost</h1>
<div align="center">
  <img src="assets/ghostlogo-white-png.png" height="200" />
</div>
ghost is a work-in-progress web proxy. It will have unblocked games while also having a whole proxy (powered with Scramjet). I plan for this web proxy to look sleek and modern while also being fast and reliable. Support me for the first release!

###

## Progress Updates
5/4/26: Made this repository!

## Developers
- lynverix - Main developer
- lynverix - Designer
- lynverix - Also a developer
=======
<h1 align="center">Scramjet</h1>
<div align="center">
  <img src="assets/scramjet.png" height="200" />
</div>

<div align="center">
  <a href="https://www.npmjs.com/package/@mercuryworkshop/scramjet"><img src="https://img.shields.io/npm/v/@mercuryworkshop/scramjet.svg?maxAge=3600" alt="npm version" /></a>
  <img src="https://img.shields.io/github/issues/MercuryWorkshop/scramjet?style=flat&color=orange" />
  <img src="https://img.shields.io/github/stars/MercuryWorkshop/scramjet?style=flat&color=orange" />
</div>

---

Scramjet is an experimental interception-based web proxy designed to evade internet censorship and bypass arbitrary browser restrictions.<br><br>
Scramjet allows you to sandbox arbitrary web content, bypass CORS restrictions on loading websites, and instrument and debug websites inside the browser itself. This is accomplished through a combination of interception, rewriting, and sandboxing techniques. You can learn more about the technical details <a href="https://developer.puter.com/blog/how-I-ported-the-web-to-the-web/"><strong>here</strong></a>.<br><br>

## Supported Sites

Some of the popular websites that Scramjet supports include:

- [Google](https://google.com) (partial)
- [Youtube](https://youtube.com)
- [Spotify](https://spotify.com) (partial)
- [Discord](https://discord.com)
- [Reddit](https://reddit.com)
- [GeForce NOW](https://play.geforcenow.com/)
- [now.gg](https://now.gg)

## Development

### Dependencies

- Recent versions of `node.js` and `pnpm`
- `rustup`
- `wasm-bindgen`
- [Binaryen's `wasm-opt`](https://github.com/WebAssembly/binaryen)
- [this `wasm-snip` fork](https://github.com/r58Playz/wasm-snip)

#### Building

- Clone the repository with `git clone --recursive https://github.com/MercuryWorkshop/scramjet`
- Install the dependencies with `pnpm i`
- Build the rewriter with `pnpm rewriter:build`
- Build Scramjet with `pnpm build`

### Running Scramjet Locally

You can run the Scramjet dev server with the command

```sh
pnpm dev
```

The demo page for scramjet should now be running at <http://localhost:4141> and should rebuild upon a file being changed (excluding the rewriter).
>>>>>>> d68e6cf
