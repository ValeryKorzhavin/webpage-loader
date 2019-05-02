import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

export default (page, output) => {
  const { protocol } = url.parse(page);
  const outputFileName = `${page.slice((`${protocol}//`).length).replace(/\W/g, '-')}.html`;
  return axios
    .get(page)
    .then(result => fs.writeFile(path.join(output, outputFileName), result.data));
};
