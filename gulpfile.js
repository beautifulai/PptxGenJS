const pkg = require('./package.json')
const path = require('path')
const rollup = require('rollup')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const typescript = require('rollup-plugin-typescript2')
const through = require('through2')
const Vinyl = require('vinyl')
const { watch, series } = require('gulp')
const gulp = require('gulp'),
	ignore = require('gulp-ignore'),
	insert = require('gulp-insert'),
	source = require('gulp-sourcemaps'),
	uglify = require('gulp-uglify')

function concatFiles (filename) {
	let latestFile = null
	const buffers = []

	return through.obj(
		function (file, enc, cb) {
			if (file.isNull()) {
				cb()
				return
			}

			if (file.isStream()) {
				cb(new Error('Streaming input is not supported'))
				return
			}

			latestFile = file
			buffers.push(file.contents)
			cb()
		},
		function (cb) {
			if (!latestFile) {
				cb()
				return
			}

			this.push(
				new Vinyl({
					cwd: latestFile.cwd,
					base: latestFile.base,
					path: path.join(latestFile.base, filename),
					stat: latestFile.stat,
					contents: Buffer.concat(buffers)
				})
			)
			cb()
		}
	)
}

gulp.task('build', () => {
	return rollup
		.rollup({
			input: './src/pptxgen.ts',
			external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
			plugins: [
				typescript({
					include: ['**/*.ts', '**/*.tsx'],
					exclude: ['**/*.d.ts'],
					typescript: require('typescript')
				}),
				nodeResolve(),
				commonjs()
			]
		})
		.then(bundle => {
			bundle.write({
				file: './src/bld/pptxgen.gulp.js',
				format: 'iife',
				name: 'PptxGenJS',
				globals: {
					jszip: 'JSZip'
				},
				sourcemap: true
			})
			return bundle
		})
		.then(bundle => {
			bundle.write({
				file: './src/bld/pptxgen.cjs.js',
				format: 'cjs',
				exports: 'default'
			})
			return bundle
		})
		.then(bundle => {
			return bundle.write({
				file: './src/bld/pptxgen.es.js',
				format: 'es'
			})
		})
})

gulp.task('min', () => {
	return gulp
		.src(['./src/bld/pptxgen.gulp.js'])
		.pipe(concatFiles('pptxgen.min.js'))
		.pipe(uglify())
		.pipe(insert.prepend('/* PptxGenJS ' + pkg.version + ' @ ' + new Date().toISOString() + ' */\n'))
		.pipe(source.init())
		.pipe(ignore.exclude(['**/*.map']))
		.pipe(source.write('./'))
		.pipe(gulp.dest('./dist/'))
})

gulp.task('bundle', () => {
	return gulp
		.src(['./libs/*', './src/bld/pptxgen.gulp.js'])
		.pipe(concatFiles('pptxgen.bundle.js'))
		.pipe(uglify())
		.pipe(insert.prepend('/* PptxGenJS ' + pkg.version + ' @ ' + new Date().toISOString() + ' */\n'))
		.pipe(source.init())
		.pipe(ignore.exclude(['**/*.map']))
		.pipe(source.write('./'))
		.pipe(gulp.dest('./dist/'))
		.pipe(gulp.dest('./demos/browser/js/'))
})

gulp.task('cjs', () => {
	return gulp
		.src(['./src/bld/pptxgen.cjs.js'])
		.pipe(insert.prepend('/* PptxGenJS ' + pkg.version + ' @ ' + new Date().toISOString() + ' */\n'))
		.pipe(gulp.dest('./dist/'))
})

gulp.task('es', () => {
	return gulp
		.src(['./src/bld/pptxgen.es.js'])
		.pipe(insert.prepend('/* PptxGenJS ' + pkg.version + ' @ ' + new Date().toISOString() + ' */\n'))
		.pipe(gulp.dest('./dist/'))
})

gulp.task('reactTestCode', () => {
	return gulp
		.src(['./dist/pptxgen.es.js'])
		.pipe(gulp.dest('./demos/react-demo/node_modules/pptxgenjs/dist'))
})

gulp.task('reactTestDefs', () => {
	return gulp
		.src(['./types/index.d.ts'])
		.pipe(gulp.dest('./demos/react-demo/node_modules/pptxgenjs/types'))
})

gulp.task('nodeTest', () => {
	return gulp
		.src(['./dist/pptxgen.cjs.js'])
		.pipe(gulp.dest('./demos/node/node_modules/pptxgenjs/dist'))
})

// Build/Deploy (ad-hoc, no watch)
gulp.task('ship', gulp.series('build', 'min', 'cjs', 'es', 'bundle', 'reactTestCode', 'reactTestDefs', 'nodeTest'), () => {
	console.log('... ./dist/*.js files created!')
})
// Build/Deploy
gulp.task('default', gulp.series('build', 'min', 'cjs', 'es', 'bundle', 'reactTestCode', 'reactTestDefs', 'nodeTest'), () => {
	console.log('... ./dist/*.js files created!')
})

// Watch
exports.default = function() {
	watch('src/*.ts', series('build', 'min', 'cjs', 'es', 'bundle', 'nodeTest'))
}
