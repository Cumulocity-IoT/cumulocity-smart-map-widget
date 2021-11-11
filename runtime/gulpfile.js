const {src, dest, series} = require('gulp');
const filter = require('gulp-filter');
const zip = require('gulp-zip');
const ngPackagr = require('ng-packagr');
const fs = require('fs-extra');
const del = require('del');
const execSync = require('child_process').execSync;
const replace = require('gulp-replace');
const path = require('path');
const inject = require('gulp-inject-string');
const pkgJson = require('./package.json');

function clean() {
    return del(['dist']);
}

const compile = series(
    function buildAngularLibrary() { return ngPackagr.build({project: './ng-package.json'}) },
    function separateWebpackBuildSrc() { return fs.copy('./dist/widget-library/fesm2015', './dist/bundle-src') },
    function importCustomCss() {
        return src(['./dist/bundle-src/custom-widget.js'])
        .pipe(inject.before('import', "import '~styles/index.css';\n"))
        .pipe(dest('./dist/bundle-src'));
    }
)

const bundle = series(
    async function webpackBuild() { return execSync("npx webpack", {stdio: 'inherit'}) },
    function copyCumulocityJson() { return fs.copy('./cumulocity.json', './dist/widget/cumulocity.json')},
    function createZip() {
        return src('./dist/widget/**/*')
            // Filter out the webpackRuntime chunk, we only need the widget code chunks
            .pipe(filter(file => !/^[a-f0-9]{20}\.js(\.map)?$/.test(file.relative)))
            .pipe(zip(`${pkgJson.name}-${pkgJson.version}.zip`))
            .pipe(dest('dist/'))
    }
)

exports.clean = clean;
exports.build = compile;
exports.bundle = bundle;
exports.default = series(clean, compile, bundle, async function success() {
    console.log("Build Finished Successfully!");
    console.log(`Runtime Widget Output (Install in the browser): dist/${pkgJson.name}-${pkgJson.version}.zip`);
    console.log(`Widget Angular Library (Install with: "npm i <filename.tgz>"): dist/${pkgJson.name}-${pkgJson.version}.tgz`);
});
