import nock from 'nock';
import { promises as fs } from 'fs';
import path from 'path';
import pageLoader from '../src';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import os from 'os';
import url from 'url';

const host = 'http://localhost';

const fixtures = path.join(__dirname, '__fixtures__');

axios.default.host = host;
axios.default.adapter = httpAdapter;


describe('suit', () => {
  it('test', async () => {

    const testData = await fs.readFile(path.join(fixtures, 'sample_page.html'), 'utf-8');
    nock(host)
      .get('/test')
      .reply(200, testData);


    const address = host + '/test';
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'out-')); 
    await pageLoader(address, output);
  });
});