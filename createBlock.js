'use strict';

const fs = require('fs');
const projectConfig = require('./projectConfig.json');

const dirs = projectConfig.dirs;
const mkdirp = require('mkdirp');

const blockName = process.argv[2];
const defaultExtensions = ['scss', 'html', 'img'];
const extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));

if (blockName) {
  const dirPath = `${dirs.srcPath + dirs.blocksDirName}/${blockName}/`;
  mkdirp(dirPath, (err) => {
    if (err) {
      console.error(`[NTH] Отмена операции: ${err}`);
    }

    else {
      console.log(`[NTH] Создание папки ${dirPath} (если отсутствует)`);

      extensions.forEach((extention) => {
        const filePath = `${dirPath + blockName}.${extention}`;
        let fileContent = '';
        let fileCreateMsg = '';

        if (extention === 'scss') {
          fileContent = `// В этом файле должны быть стили для БЭМ-блока ${blockName}, его элементов, \n// модификаторов, псевдоселекторов, псевдоэлементов, @media-условий...\n// Очередность: http://nicothin.github.io/idiomatic-pre-CSS/#priority\n\n.${blockName} {\n\n  $block-name:                &; // #{$block-name}__element {}\n\n}\n`;

          let hasThisBlock = false;
          for (const block in projectConfig.blocks) {
            if (block === blockName) {
              hasThisBlock = true;
              break;
            }
          }
          if (!hasThisBlock) {
            projectConfig.blocks[blockName] = [];
            const newPackageJson = JSON.stringify(projectConfig, '', 2);
            fs.writeFileSync('./projectConfig.json', newPackageJson);
            fileCreateMsg = '[NTH] Подключение блока добавлено в projectConfig.json';
          }
        }

        else if (extention === 'html') {
          fileContent = `<!--DEV\n\nДля использования этого файла как шаблона:\n\n@ @include('blocks/${blockName}/${blockName}.html')\n\n(Нужно убрать пробел между символами @)\nПодробнее: https://www.npmjs.com/package/gulp-file-include\n\n-->\n\n<div class="${blockName}">content</div>\n`;
        }

        else if (extention === 'js') {
          fileContent = '// document.addEventListener(\'DOMContentLoaded\', function(){});\n// (function(){\n// код\n// }());\n';
        }

        else if (extention === 'img') {
          const imgFolder = `${dirPath}img/`;
          if (fileExist(imgFolder) === false) {
            mkdirp(imgFolder, (err) => {
              if (err) console.error(err);
              else console.log(`[NTH] Создание папки: ${imgFolder} (если отсутствует)`);
            });
          } else {
            console.log(`[NTH] Папка ${imgFolder} НЕ создана (уже существует) `);
          }
        }

        if (fileExist(filePath) === false && extention !== 'img') {
          fs.writeFile(filePath, fileContent, (err) => {
            if (err) {
              return console.log(`[NTH] Файл НЕ создан: ${err}`);
            }
            console.log(`[NTH] Файл создан: ${filePath}`);
            if (fileCreateMsg) {
              console.warn(fileCreateMsg);
            }
          });
        } else if (extention !== 'img') {
          console.log(`[NTH] Файл НЕ создан: ${filePath} (уже существует)`);
        }
      });
    }
  });
} else {
  console.log('[NTH] Отмена операции: не указан блок');
}

function uniqueArray(arr) {
  const objectTemp = {};
  for (let i = 0; i < arr.length; i++) {
    const str = arr[i];
    objectTemp[str] = true;
  }
  return Object.keys(objectTemp);
}

function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}
