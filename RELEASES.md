# PptxGenJS Release Checklist

## Beta Releases

1. Update `package.json` version (ex: `3.12.0-beta.0`)
2. Update `src/pptxgen.ts` version
3. Build library: npm scripts > `ship`
4. `npm publish --tag beta`

## Build Library, Update Files

1. Update `package.json` version
2. Update `src/pptxgen.ts` version (eg: `const VERSION = '3.3.1'`)
3. Update `CHANGELOG.md` with new date
4. Update `README.md` with new CDN links
5. Build library: npm scripts > `ship`
6. Consolidate new changes from `src/bld/*.ts` into `types/index.d.ts` and update version in head comment
7. Open `dist/*.js` and check headers

## Run Platform Tests

### Browser Test

1. Run `~/GitHub/PptxGenJS/demos/node browser_server.mjs`
2. Ensure newest `pptxgen.bundle.js` is loaded using F12 > Sources tab
3. Run all tests in browser [Demo Page](file:///Users/brentely/GitHub/PptxGenJS/demos/browser/index.html)

### Node Test

1. Update `demos/node/package.json` version
2. Run various tests

```bash
cd ~/GitHub/PptxGenJS/demos/node
npm run demo
npm run demo-all
npm run demo-text
npm run demo-stream
```

## Release New Version

### Pre-Release Check

1. Update: `demos/browser/index.html` head to use "RELEASE (CDN)"
2. Check: Is `version` updated in package.json?
3. Check: Is `version` updated in src/pptxgen.ts?
4. Check: Is `types/index.d.ts` version in header updated?

### GitHub

1. Checkin all changes via GitHub Desktop
2. Copy CHANGELOG entry and draft new release: [Releases](https://github.com/gitbrent/PptxGenJS/releases)
3. Use "Version X.x.x" as title and "v3.6.0" as tag
4. Go back to Releases page, double-check title/tag, release when ready

### NPM

```bash
cd ~/GitHub/PptxGenJS
npm publish
```

## Post-Release Tasks

1. Test CDN links on README.md
2. Load **gh-pages** branch
3. Update `installation.md` with latest CDN version
4. Copy contents of the newest "build" folder (from above) into `./demo-react` folder
5. Update API documentation if needed
