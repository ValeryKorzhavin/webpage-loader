#!/usr/bin/env node

import program from 'commander';
import pageLoader from '..';
import { version, description } from '../../package.json';

program
  .version(version)
  .description(description)
  .arguments('<pageUrl>')
  .option('-o, --output [dir]', 'output dir', './')
  .usage('[options] <pageUrl>')
  .action(pageUrl => pageLoader(pageUrl, program.output))
  .parse(process.argv);
