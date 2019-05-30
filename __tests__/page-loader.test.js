import os from 'os';
import path from 'path';
import nock from 'nock';
import axios from 'axios';
import { promises as fs } from 'fs';
import httpAdapter from 'axios/lib/adapters/http';
import pageLoader from '../src';

const host = 'http://localhost';
const fixtures = path.join(__dirname, '__fixtures__');

axios.default.adapter = httpAdapter;

const files = {};

beforeAll(async () => {
  files.sourcePage = await fs.readFile(path.join(fixtures, 'source_page.html'), 'utf-8');
  files.withResources = await fs.readFile(path.join(fixtures, 'with_resources.html'), 'utf-8');
  files.downloadedPage = await fs.readFile(path.join(fixtures, 'downloaded_page.html'), 'utf-8');

  files.sourceImg = await fs.readFile(path.join(fixtures, 'assets/image.jpg'));
  files.sourceCss = await fs.readFile(path.join(fixtures, 'assets/style.css'), 'utf-8');
  files.sourceJs = await fs.readFile(path.join(fixtures, 'assets/script.js'), 'utf-8');
});

describe('suit', () => {
  it('download page', async () => {
    nock(host)
      .get('/test')
      .reply(200, files.sourcePage);

    const address = `${host}/test`;
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'out-'));

    await pageLoader(address, output);
    const downloadedPage = await fs.readFile(path.join(output, 'localhost-test.html'), 'utf-8');
    expect(files.sourcePage).toBe(downloadedPage);
  });

  it('download page with resources', async () => {
    nock(host)
      .get('/test')
      .reply(200, files.withResources)
      .get('/assets/style.css')
      .reply(200, files.sourceCss)
      .get('/assets/image.jpg')
      .reply(200, files.sourceImg)
      .get('/assets/script.js')
      .reply(200, files.sourceJs);

    const address = `${host}/test`;
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'out-'));

    await pageLoader(address, output);
    const downloadedPage = await fs.readFile(path.join(output, 'localhost-test.html'), 'utf-8');

    const downloadedImg = await fs.readFile(path.join(output, 'localhost-test_files', 'assets-image.jpg'));
    const downloadedCss = await fs.readFile(path.join(output, 'localhost-test_files', 'assets-style.css'), 'utf-8');
    const downloadedJs = await fs.readFile(path.join(output, 'localhost-test_files', 'assets-script.js'), 'utf-8');

    expect(files.downloadedPage).toBe(downloadedPage);
    expect(files.sourceCss).toBe(downloadedCss);
    expect(files.sourceJs).toBe(downloadedJs);
    expect(files.sourceImg).toEqual(downloadedImg);
  });

  it('404 file not found', async () => {
    const url = '404-not-found';
    nock(host)
      .get(url)
      .reply(404);

    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'out-'));
    await expect(pageLoader(`${host}/${url}`, output)).rejects.toThrowErrorMatchingSnapshot();
  });

  it('directory doesn`t exist', async () => {
    nock(host)
      .get('/test')
      .reply(200, files.sourcePage);

    const url = `${host}/test`;
    const output = 'unknown';
    await expect(pageLoader(url, output)).rejects.toThrowErrorMatchingSnapshot();
  });
});
