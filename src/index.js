import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import Listr from 'listr';
import debug from 'debug';
import _ from 'lodash';

const assetsType = {
  link: 'href',
  img: 'src',
  script: 'src',
};

const saveLog = debug('page-loader:save');
const createLog = debug('page-loader:create');
const downloadLog = debug('page-loader:download');
const errorLog = debug('page-loader:error');

const getLocalName = filepath => _.trim(filepath, '/').replace(/\W/g, '-');

export default (page, dirName) => {
  const { host, pathname, origin } = new URL(page);
  const outputName = getLocalName(`${host}${pathname}`);
  const assetsDirName = path.join(dirName, `${outputName}_files`);
  const outputFileName = `${outputName}.html`;
  const urls = [];
  const assets = [];

  return axios
    .get(page)
    .then((data) => {
      downloadLog('get html document');
      const $ = cheerio.load(data.data);
      $(Object.keys(assetsType).join(','))
        .filter((i, el) => (
          !!el.attribs[assetsType[el.name]] && !url.parse(el.attribs[assetsType[el.name]]).host))
        .each((i, el) => {
          const { dir, name, ext } = path.parse(el.attribs[assetsType[el.name]]);
          const uri = _.trim(url.parse(el.attribs[assetsType[el.name]]).href, '/');
          urls.push(`${origin}/${uri}`);
          const assetName = getLocalName(`${dir}/${name}`).concat(ext);
          const assetPath = path.join(assetsDirName, assetName);
          assets.push(assetPath);
          $(el).attr(assetsType[el.name], path.join(`${outputName}_files`, assetName));
        });
      return $.html();
    })
    .then((html) => {
      createLog('create local html document');
      return fs.writeFile(path.join(dirName, outputFileName), html);
    })
    .then(() => {
      createLog('create directory for assets');
      return fs.mkdir(assetsDirName);
    })
    .then(() => {
      const tasks = new Listr(urls.map((assetUrl, index) => ({
        title: `download resource from ${assetUrl}`,
        task: (context, task) => axios
          .get(assetUrl, { responseType: 'arraybuffer' })
          .then((result) => {
            downloadLog(`get resource from ${assetUrl}`);
            fs.writeFile(assets[index], result.data);
            saveLog(`save resource to ${assets[index]}`);
          })
          .catch((error) => {
            errorLog(`${error}`);
            task.skip(`resource ${assetUrl} unavailable.`);
          }),
      })), { concurrent: true });
      return tasks.run();
    })
    .catch((error) => {
      errorLog(`${error.message}`);
      const err = {};
      if (error.request) {
        err.message = `${error.config.url} unavailable.`;
        err.code = 1;
      } else {
        err.message = error.message;
        err.code = error.errno;
      }

      throw err;
    });
};
