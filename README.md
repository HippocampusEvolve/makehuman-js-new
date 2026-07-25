# makehuman-js-new

[![CI](https://github.com/HippocampusEvolve/makehuman-js-new/actions/workflows/ci.yml/badge.svg)](https://github.com/HippocampusEvolve/makehuman-js-new/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

Fork of [makehuman-js](https://github.com/makehuman-js/makehuman-js) — a JavaScript library that
builds 3D human models in the browser — kept buildable on current Node.js.

The original project by [wassname](https://github.com/wassname) hasn't been updated since 2017.

![](docs/images/ui-screenshot.png)

## Status

This fork is a **working baseline, not a rewrite**. The source and the toolchain are still the
original 2017 ones; what this repo adds is a verified answer to "does it still build?".

| | Version here | Notes |
|---|---|---|
| Three.js | `^0.82.1` (r82) | the code targets the pre-r125 API (`Geometry`, old materials) |
| Webpack | `2.1.0-beta.21` | builds `makehuman.js` (2.6 MB) without patching |
| Babel | 6 (`es2015` + `stage-1` presets) | |
| ESLint | 3 with `airbnb` config | |
| Node.js | 18 / 20 / 22 | `npm ci && npm run build` verified in CI on all three |

Planned, in rough order: Webpack 5 + Babel 7 (mechanical), ESLint 9 flat config, then Three.js
r1xx — the last one is the expensive step, because everything after r125 removed `Geometry` and
reworked the material and loader APIs this code is built on. Until that lands, the README will
not claim it.

## Original Project

- **Repo:** [makehuman-js/makehuman-js](https://github.com/makehuman-js/makehuman-js)
- **Author:** Mike Clark ([wassname](https://github.com/wassname))
- **Original demo:** [mhwebui.wassname.com](http://mhwebui.wassname.com/)
- **Example:** [makehuman-js-example](https://github.com/makehuman-js/makehuman-js-example)

## Usage

```bash
git clone https://github.com/HippocampusEvolve/makehuman-js-new.git
cd makehuman-js-new
npm ci
npm run build    # bundle to dist/makehuman.js
npm start        # dev server with hot reload
npm test         # opens a browser with the mocha suite
```

`npm run build` is the path covered by CI. `npm start` and `npm test` both rely on
`webpack-dev-server@2.1.0-beta` and open a browser, so they are not run there.

## Acknowledgement

This project is based on [makehuman-js](https://github.com/makehuman-js/makehuman-js) by wassname, which was inspired by the desktop Python software [makehuman.org](http://www.makehuman.org/). Data and models are provided by the MakeHuman project — thanks to all contributors listed [here](http://www.makehuman.org/halloffame.php).

## License

[AGPL-3.0](LICENSE) — same as the original project.

Code outputs are CC0. Data/models remain under the MakeHuman project license.
