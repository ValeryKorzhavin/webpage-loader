install:
	npm install

run:
	npx babel-node -- 'src/bin/page-loader.js' https://ru.hexlet.io/courses

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	DEBUG=page-loader* npm test
