"use strict";

const fs = require("fs");
const gulp = require("gulp");
const gulpSequence = require("gulp-sequence");
const browserSync = require("browser-sync").create();

const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const mqpacker = require("css-mqpacker");
const sortCSSmq = require("sort-css-media-queries");
const atImport = require("postcss-import");
const cleanss = require("gulp-cleancss");
const inlineSVG = require("postcss-inline-svg");
const imageInliner = require("postcss-image-inliner");
const objectFitImages = require("postcss-object-fit-images");

const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const gulpIf = require("gulp-if");
const debug = require("gulp-debug");
const rename = require("gulp-rename");
const size = require("gulp-size");
const del = require("del");
const newer = require("gulp-newer");
const replace = require("gulp-replace");

let projectConfig = require("./projectConfig.json");
let dirs = projectConfig.dirs;
let lists = getFilesList(projectConfig);

let styleImports =
  "/*!*\n * ВНИМАНИЕ! Этот файл генерируется автоматически.\n * Не пишите сюда ничего вручную, все такие правки будут потеряны.\n * Читайте ./README.md для понимания.\n */\n\n";
lists.css.forEach(function(blockPath) {
  styleImports += "@import '" + blockPath + "';\n";
});
fs.writeFileSync(dirs.srcPath + "scss/style.scss", styleImports);

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == "dev";

let postCssPlugins = [
  autoprefixer({ browsers: ["last 2 version"] }),
  mqpacker({
    sort: sortCSSmq.desktopFirst
  }),
  atImport(),
  inlineSVG(),
  objectFitImages(),
  imageInliner({
    assetPaths: ["src/blocks/**/img_to_bg/"],
    maxFileSize: 10240
  })
];

gulp.task("clean", function() {
  console.log("---------- Очистка папки сборки");
  return del([dirs.buildPath + "/**/*", "!" + dirs.buildPath + "/readme.md"]);
});

gulp.task("style", function() {
  const sass = require("gulp-sass");
  const sourcemaps = require("gulp-sourcemaps");
  const wait = require("gulp-wait");
  console.log("---------- Компиляция стилей");
  return gulp
    .src(dirs.srcPath + "scss/style.scss")
    .pipe(
      plumber({
        errorHandler: function(err) {
          notify.onError({
            title: "Styles compilation error",
            message: err.message
          })(err);
          this.emit("end");
        }
      })
    )
    .pipe(wait(100))
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(debug({ title: "Style:" }))
    .pipe(sass())
    .pipe(postcss(postCssPlugins))
    .pipe(gulpIf(!isDev, cleanss()))
    .pipe(rename("style.min.css"))
    .pipe(gulpIf(isDev, sourcemaps.write("/")))
    .pipe(
      size({
        title: "Размер",
        showFiles: true,
        showTotal: false
      })
    )
    .pipe(gulp.dest(dirs.buildPath + "/css"))
    .pipe(browserSync.stream({ match: "**/*.css" }));
});

gulp.task("style:single", function() {
  if (projectConfig.singleCompiled.length) {
    const sass = require("gulp-sass");
    const sourcemaps = require("gulp-sourcemaps");
    const wait = require("gulp-wait");
    console.log("---------- Компиляция добавочных стилей");
    return gulp
      .src(projectConfig.singleCompiled)
      .pipe(
        plumber({
          errorHandler: function(err) {
            notify.onError({
              title: "Single style compilation error",
              message: err.message
            })(err);
            this.emit("end");
          }
        })
      )
      .pipe(wait(100))
      .pipe(gulpIf(isDev, sourcemaps.init()))
      .pipe(debug({ title: "Single style:" }))
      .pipe(sass())
      .pipe(postcss(postCssPlugins))
      .pipe(gulpIf(!isDev, cleanss()))
      .pipe(gulpIf(isDev, sourcemaps.write("/")))
      .pipe(
        size({
          title: "Размер",
          showFiles: true,
          showTotal: false
        })
      )
      .pipe(gulp.dest(dirs.buildPath + "/css"))
      .pipe(browserSync.stream({ match: "**/*.css" }));
  }
});

gulp.task("copy:css", function(callback) {
  if (projectConfig.copiedCss.length) {
    return gulp
      .src(projectConfig.copiedCss)
      .pipe(postcss(postCssPlugins))
      .pipe(cleanss())
      .pipe(
        size({
          title: "Размер",
          showFiles: true,
          showTotal: false
        })
      )
      .pipe(gulp.dest(dirs.buildPath + "/css"))
      .pipe(browserSync.stream());
  } else {
    callback();
  }
});

gulp.task("copy:img", function() {
  console.log("---------- Копирование изображений");
  return gulp
    .src(lists.img)
    .pipe(newer(dirs.buildPath + "/img"))
    .pipe(
      size({
        title: "Размер",
        showFiles: true,
        showTotal: false
      })
    )
    .pipe(gulp.dest(dirs.buildPath + "/img"));
});

gulp.task("copy:js", function(callback) {
  if (projectConfig.copiedJs.length) {
    return gulp
      .src(projectConfig.copiedJs)
      .pipe(
        size({
          title: "Размер",
          showFiles: true,
          showTotal: false
        })
      )
      .pipe(gulp.dest(dirs.buildPath + "/js"));
  } else {
    callback();
  }
});

gulp.task("copy:fonts", function() {
  console.log("---------- Копирование шрифтов");
  return gulp
    .src(dirs.srcPath + "/fonts/*.{ttf,woff,woff2,eot,svg}")
    .pipe(newer(dirs.buildPath + "/fonts"))
    .pipe(
      size({
        title: "Размер",
        showFiles: true,
        showTotal: false
      })
    )
    .pipe(gulp.dest(dirs.buildPath + "/fonts"));
});

let spriteSvgPath = dirs.srcPath + dirs.blocksDirName + "/sprite-svg/svg/";
gulp.task("sprite:svg", function(callback) {
  if (projectConfig.blocks["sprite-svg"] !== undefined) {
    const svgstore = require("gulp-svgstore");
    const svgmin = require("gulp-svgmin");
    // const cheerio = require('gulp-cheerio');
    if (fileExist(spriteSvgPath) !== false) {
      console.log("---------- Сборка SVG спрайта");
      return (
        gulp
          .src(spriteSvgPath + "*.svg")
          .pipe(
            svgmin(function(file) {
              return {
                plugins: [
                  {
                    cleanupIDs: {
                      minify: true
                    }
                  }
                ]
              };
            })
          )
          .pipe(svgstore({ inlineSvg: true }))
          // .pipe(cheerio(function ($) {
          //   $('svg').attr('style',  'display:none');
          // }))
          .pipe(rename("sprite-svg.svg"))
          // .pipe(replace(/viewbox/gm, 'viewBox'))
          .pipe(
            size({
              title: "Размер",
              showFiles: true,
              showTotal: false
            })
          )
          .pipe(
            gulp.dest(dirs.srcPath + dirs.blocksDirName + "/sprite-svg/img/")
          )
      );
    } else {
      console.log(
        "---------- Сборка SVG спрайта: ОТМЕНА, нет папки с картинками"
      );
      callback();
    }
  } else {
    console.log(
      "---------- Сборка SVG спрайта: ОТМЕНА, блок не используется на проекте"
    );
    callback();
  }
});

let spritePngPath = dirs.srcPath + dirs.blocksDirName + "/sprite-png/png/";
gulp.task("sprite:png", function(callback) {
  if (projectConfig.blocks["sprite-png"] !== undefined) {
    const spritesmith = require("gulp.spritesmith");
    const buffer = require("vinyl-buffer");
    const merge = require("merge-stream");
    const imagemin = require("gulp-imagemin");
    const pngquant = require("imagemin-pngquant");
    if (fileExist(spritePngPath) !== false) {
      del(dirs.srcPath + dirs.blocksDirName + "/sprite-png/img/*.png");
      let fileName =
        "sprite-" +
        Math.random()
          .toString()
          .replace(/[^0-9]/g, "") +
        ".png";
      let spriteData = gulp.src(spritePngPath + "*.png").pipe(
        spritesmith({
          imgName: fileName,
          cssName: "sprite-png.scss",
          padding: 4,
          imgPath: "../img/" + fileName
        })
      );
      let imgStream = spriteData.img
        .pipe(buffer())
        .pipe(
          imagemin({
            use: [pngquant()]
          })
        )
        .pipe(
          gulp.dest(dirs.srcPath + dirs.blocksDirName + "/sprite-png/img/")
        );
      let cssStream = spriteData.css.pipe(
        gulp.dest(dirs.srcPath + dirs.blocksDirName + "/sprite-png/")
      );
      return merge(imgStream, cssStream);
    } else {
      console.log(
        "---------- Сборка PNG спрайта: ОТМЕНА, нет папки с картинками"
      );
      callback();
    }
  } else {
    console.log(
      "---------- Сборка PNG спрайта: ОТМЕНА, блок не используется на проекте"
    );
    callback();
  }
});

gulp.task("html", function() {
  const fileinclude = require("gulp-file-include");
  console.log("---------- сборка HTML");
  return gulp
    .src(dirs.srcPath + "/*.html")
    .pipe(
      plumber({
        errorHandler: function(err) {
          notify.onError({
            title: "HTML compilation error",
            message: err.message
          })(err);
          this.emit("end");
        }
      })
    )
    .pipe(
      fileinclude({
        prefix: "@@",
        basepath: "@file",
        indent: true
      })
    )
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ""))
    .pipe(gulp.dest(dirs.buildPath));
});

gulp.task("js", function(callback) {
  const uglify = require("gulp-uglify");
  const concat = require("gulp-concat");
  if (lists.js.length > 0) {
    console.log("---------- Обработка JS");
    return (
      gulp
        .src(lists.js)
        .pipe(
          plumber({
            errorHandler: function(err) {
              notify.onError({
                title: "Javascript concat/uglify error",
                message: err.message
              })(err);
              this.emit("end");
            }
          })
        )
        .pipe(concat("script.min.js"))
        // .pipe(gulpIf(!isDev, uglify()))
        .pipe(
          size({
            title: "Размер",
            showFiles: true,
            showTotal: false
          })
        )
        .pipe(gulp.dest(dirs.buildPath + "/js"))
    );
  } else {
    console.log("---------- Обработка JS: в сборке нет JS-файлов");
    callback();
  }
});

const folder = process.env.folder;
gulp.task("img:opt", function(callback) {
  const imagemin = require("gulp-imagemin");
  const pngquant = require("imagemin-pngquant");
  if (folder) {
    console.log("---------- Оптимизация картинок");
    return gulp
      .src(folder + "/*.{jpg,jpeg,gif,png,svg}")
      .pipe(
        imagemin({
          progressive: true,
          svgoPlugins: [{ removeViewBox: false }],
          use: [pngquant()]
        })
      )
      .pipe(gulp.dest(folder));
  } else {
    console.log("---------- Оптимизация картинок: ошибка (не указана папка)");
    console.log(
      "---------- Пример вызова команды: folder=src/blocks/block-name/img npm start img:opt"
    );
    callback();
  }
});

gulp.task("build", function(callback) {
  gulpSequence(
    "clean",
    ["sprite:svg", "sprite:png"],
    [
      "style",
      "style:single",
      "js",
      "copy:css",
      "copy:img",
      "copy:js",
      "copy:fonts"
    ],
    "html",
    callback
  );
});

gulp.task("deploy", function() {
  const ghPages = require("gulp-gh-pages");
  console.log("---------- Публикация содержимого ./build/ на GH pages");
  return gulp.src(dirs.buildPath + "**/*").pipe(ghPages());
});

gulp.task("default", ["serve"]);

gulp.task("serve", ["build"], function() {
  browserSync.init({
    server: dirs.buildPath,
    startPath: "index.html",
    open: false,
    port: 8080
  });

  gulp.watch(
    [
      dirs.srcPath + "scss/style.scss",
      dirs.srcPath + dirs.blocksDirName + "/**/*.scss",
      projectConfig.addCssBefore,
      projectConfig.addCssAfter
    ],
    ["style"]
  );

  gulp.watch(projectConfig.singleCompiled, ["style:single"]);

  if (projectConfig.copiedCss.length) {
    gulp.watch(projectConfig.copiedCss, ["copy:css"]);
  }
  if (lists.img.length) {
    gulp.watch(lists.img, ["watch:img"]);
  }
  if (projectConfig.copiedJs.length) {
    gulp.watch(projectConfig.copiedJs, ["watch:copied:js"]);
  }
  gulp.watch("/fonts/*.{ttf,woff,woff2,eot,svg}", { cwd: dirs.srcPath }, [
    "watch:fonts"
  ]);
  gulp.watch(
    ["*.html", "_include/*.html", dirs.blocksDirName + "/**/*.html"],
    { cwd: dirs.srcPath },
    ["watch:html"]
  );
  if (lists.js.length) {
    gulp.watch(lists.js, ["watch:js"]);
  }
  if (projectConfig.blocks["sprite-svg"] !== undefined) {
    gulp.watch("*.svg", { cwd: spriteSvgPath }, ["watch:sprite:svg"]);
  }
  // Слежение за PNG (спрайты)
  if (projectConfig.blocks["sprite-png"] !== undefined) {
    gulp.watch("*.png", { cwd: spritePngPath }, ["watch:sprite:png"]);
  }
});

gulp.task("watch:img", ["copy:img"], reload);
gulp.task("watch:copied:js", ["copy:js"], reload);
gulp.task("watch:fonts", ["copy:fonts"], reload);
gulp.task("watch:html", ["html"], reload);
gulp.task("watch:js", ["js"], reload);
gulp.task("watch:sprite:svg", ["sprite:svg"], reload);
gulp.task("watch:sprite:png", ["sprite:png"], reload);

/**
 * Вернет объект с обрабатываемыми файлами и папками
 * @param  {object}
 * @return {object}
 */
function getFilesList(config) {
  let res = {
    css: [],
    js: [],
    img: []
  };

  for (let blockName in config.blocks) {
    res.css.push(
      config.dirs.srcPath +
        config.dirs.blocksDirName +
        "/" +
        blockName +
        "/" +
        blockName +
        ".scss"
    );
    if (config.blocks[blockName].length) {
      config.blocks[blockName].forEach(function(elementName) {
        res.css.push(
          config.dirs.srcPath +
            config.dirs.blocksDirName +
            "/" +
            blockName +
            "/" +
            blockName +
            elementName +
            ".scss"
        );
      });
    }
  }
  res.css = res.css.concat(config.addCssAfter);
  res.css = config.addCssBefore.concat(res.css);

  for (let blockName in config.blocks) {
    res.js.push(
      config.dirs.srcPath +
        config.dirs.blocksDirName +
        "/" +
        blockName +
        "/" +
        blockName +
        ".js"
    );
    if (config.blocks[blockName].length) {
      config.blocks[blockName].forEach(function(elementName) {
        res.js.push(
          config.dirs.srcPath +
            config.dirs.blocksDirName +
            "/" +
            blockName +
            "/" +
            blockName +
            elementName +
            ".js"
        );
      });
    }
  }
  res.js = res.js.concat(config.addJsAfter);
  res.js = config.addJsBefore.concat(res.js);

  for (let blockName in config.blocks) {
    res.img.push(
      config.dirs.srcPath +
        config.dirs.blocksDirName +
        "/" +
        blockName +
        "/img/*.{jpg,jpeg,gif,png,svg}"
    );
  }
  res.img = config.addImages.concat(res.img);

  return res;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки]
 * @return {boolean}
 */
function fileExist(path) {
  const fs = require("fs");
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === "ENOENT");
  }
}

function reload(done) {
  browserSync.reload();
  done();
}
