install:
	npm install

run:
	npx babel-node -- 'src/bin/page-loader.js' https://hexlet.io/courses

publish:
	npm publish

lint:
	npx eslint .

test:
	npm test

test-watch:
	npm test --watch