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

describe('suit', () => {
  it('download page', async () => {
    const sourcePage = await fs.readFile(path.join(fixtures, 'source_page.html'), 'utf-8');

    nock(host)
      .get('/test')
      .reply(200, sourcePage);

    const address = `${host}/test`;
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'out-'));

    await pageLoader(address, output);
    const downloadedFile = await fs.readFile(path.join(output, 'localhost-test.html'), 'utf-8');
    expect(sourcePage).toBe(downloadedFile);
  });

  it('download page with resources', async () => {
    const resultPage = await fs.readFile(path.join(fixtures, 'downloaded_page.html'), 'utf-8');
    nock(host)
      .get('/test')
      .replyWithFile(200, path.join(fixtures, 'with_resources.html'))
      .get('/assets/style.css')
      .replyWithFile(200, path.join(fixtures, 'assets/style.css'))
      .get('/assets/image.jpg')
      .replyWithFile(200, path.join(fixtures, 'assets/image.jpg'))
      .get('/assets/script.js')
      .replyWithFile(200, path.join(fixtures, 'assets/script.js'));

    const address = `${host}/test`;
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'out-'));

    await pageLoader(address, output);
    const downloadedFile = await fs.readFile(path.join(output, 'localhost-test.html'), 'utf-8');
    const downloadedCss = await fs.readFile(path.join(output, 'localhost-test_files', 'assets-style.css'), 'utf-8');
    const downloadedJs = await fs.readFile(path.join(output, 'localhost-test_files', 'assets-script.js'), 'utf-8');
    const downloadedImg = await fs.readFile(path.join(output, 'localhost-test_files', 'assets-image.jpg'));

    const sourceCss = await fs.readFile(path.join(fixtures, 'assets/style.css'), 'utf-8');
    const sourceImg = await fs.readFile(path.join(fixtures, 'assets/image.jpg'));
    const sourceJs = await fs.readFile(path.join(fixtures, 'assets/script.js'), 'utf-8');

    expect(resultPage).toBe(downloadedFile);
    expect(sourceCss).toBe(downloadedCss);
    expect(sourceImg).toEqual(downloadedImg);
    expect(sourceJs).toBe(downloadedJs);
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
      .replyWithFile(200, path.join(fixtures, 'source_page.html'));

    const url = `${host}/test`;
    const output = 'unknown';
    await expect(pageLoader(url, output)).rejects.toThrowErrorMatchingSnapshot();
  });
});
