import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import Listr from 'listr';
import debug from 'debug';
import _ from 'lodash';

const assets = {
  link: 'href',
  img: 'src',
  script: 'src',
};

const saveLog = debug('page-loader:save');
const createLog = debug('page-loader:create');
const downloadLog = debug('page-loader:download');
const errorLog = debug('page-loader:error');

const getCanonicalName = filepath => _.trim(filepath, '/').replace(/\W/g, '-');

export default (page, dirName) => {
  const { host, pathname, origin } = new URL(page);
  const outputName = getCanonicalName(`${host}${pathname}`);
  const assetsDirName = path.join(dirName, `${outputName}_files`);
  const outputFileName = `${outputName}.html`;
  const urls = [];
  const fileNames = [];

  return axios
    .get(page)
    .then((data) => {
      downloadLog('get html document');
      const $ = cheerio.load(data.data);
      $(Object.keys(assets).join(','))
        .filter((i, el) => (
          !!el.attribs[assets[el.name]] && !url.parse(el.attribs[assets[el.name]]).host))
        .each((i, el) => {
          const { dir, name, ext } = path.parse(el.attribs[assets[el.name]]);
          const uri = _.trim(url.parse(el.attribs[assets[el.name]]).href, '/');
          urls.push(`${origin}/${uri}`);
          const fileName = path.join(assetsDirName, getCanonicalName(`${dir}/${name}`).concat(ext));
          fileNames.push(fileName);
          $(el).attr(assets[el.name], path.join(`${outputName}_files`, getCanonicalName(`${dir}/${name}`).concat(ext)));
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
      const tasks = new Listr(urls.map((Url, ind) => ({
        title: `download resource from ${Url}`,
        task: (context, task) => axios
          .get(Url, { responseType: 'arraybuffer' })
          .then((result) => {
            downloadLog(`get resource from ${Url}`);
            fs.writeFile(fileNames[ind], result.data);
            saveLog(`save resource to ${fileNames[ind]}`);
          })
          .catch((error) => {
            console.error(error.message);
            task.skip(`resource ${Url} unavailable.`);
            errorLog(`resource ${Url} unavailable.`);
          }),
      })), { concurrent: true });
      return tasks.run();
    })
    .catch((error) => {
      const err = {};
      if (error.request) {
        err.message = `${error.config.url} ${error.response.statusText}.`;
        err.code = 1;
      } else {
        err.message = error.message;
        err.code = error.errno;
      }

      throw err;
    });
};
