const pkg = require("./package.json");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("rollup-plugin-typescript2");

module.exports = {
  input: "src/pptxgen.ts",
  output: [
    {
      file: "./src/bld/pptxgen.js",
      format: "iife",
      name: "PptxGenJS",
      globals: {
        jszip: "JSZip",
      },
    },
    {
      file: "./src/bld/pptxgen.cjs.js",
      format: "cjs",
      exports: "default",
    },
    /*
    {
      file: "./src/bld/pptxgen.umd.js",
      format: "umd",
      name: "PptxGenJS",
      globals: {
        jszip: "JSZip",
      },
	},
	*/
    {
      file: "./src/bld/pptxgen.es.js",
      format: "es",
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
  plugins: [
    typescript({
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["**/*.d.ts"],
      typescript: require("typescript"),
    }),
    resolve.nodeResolve(),
    commonjs(),
  ],
};
