# makehuman-js-new

Modernized fork of [makehuman-js](https://github.com/makehuman-js/makehuman-js) — a JavaScript library that builds 3D human models in the browser.

The original project by [wassname](https://github.com/wassname) hasn't been updated since 2017. This fork brings it to 2026 with modern tooling and dependencies.

![](docs/images/ui-screenshot.png)

## What's Changed

- **Three.js** updated to `r175` (from r87)
- **Webpack 5** with modern config (from Webpack 2)
- **Babel 7** with `@babel/preset-env` (from Babel 6)
- **ESLint 8** with Airbnb config
- **Tween.js** updated to `@tweenjs/tween.js@25` (from old tween.js)
- All dependencies updated to current versions
- Build and dev-server work on modern Node.js (18+)

## Original Project

- **Repo:** [makehuman-js/makehuman-js](https://github.com/makehuman-js/makehuman-js)
- **Author:** Mike Clark ([wassname](https://github.com/wassname))
- **Original demo:** [mhwebui.wassname.com](http://mhwebui.wassname.com/)
- **Example:** [makehuman-js-example](https://github.com/makehuman-js/makehuman-js-example)

## Usage

```bash
git clone https://github.com/HippocampusEvolve/makehuman-js-new.git
cd makehuman-js-new
npm install
npm start        # dev server with hot reload
npm run build    # production build
npm test         # run tests in browser
```

## Tests

```bash
npm test
```

This launches a browser with mocha unit tests.

## Acknowledgement

This project is based on [makehuman-js](https://github.com/makehuman-js/makehuman-js) by wassname, which was inspired by the desktop Python software [makehuman.org](http://www.makehuman.org/). Data and models are provided by the MakeHuman project — thanks to all contributors listed [here](http://www.makehuman.org/halloffame.php).

## License

AGPLv3 — same as the original project. See the original repo for full license terms.

Code outputs are CC0. Data/models remain under the MakeHuman project license.
