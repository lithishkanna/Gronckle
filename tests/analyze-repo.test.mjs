import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest } from '../src/lib/analyze.ts';

describe('Analyze Repo Manifest Parser Unit Tests', () => {
  test('correctly parses package.json dependencies and devDependencies', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        'react': '^18.0.0',
        'moment': '^2.29.4',
        'express': '^4.18.0',
      },
      devDependencies: {
        'typescript': '^5.0.0',
        'vitest': '^1.0.0',
      },
    });

    const { dependencies, primaryLang } = parseManifest(pkgJson, 'package.json');
    assert.equal(primaryLang, 'typescript');
    assert.equal(dependencies.length, 5);
    assert.ok(dependencies.includes('react'));
    assert.ok(dependencies.includes('moment'));
    assert.ok(dependencies.includes('express'));
    assert.ok(dependencies.includes('typescript'));
    assert.ok(dependencies.includes('vitest'));
  });

  test('correctly parses Python requirements.txt', () => {
    const requirements = `
# Core dependencies
fastapi>=0.100.0
uvicorn==0.23.0
pydantic>=2.0
requests==2.31.0
pytest # dev
-r base.txt
`;

    const { dependencies, primaryLang } = parseManifest(requirements, 'requirements.txt');
    assert.equal(primaryLang, 'python');
    assert.ok(dependencies.includes('fastapi'));
    assert.ok(dependencies.includes('uvicorn'));
    assert.ok(dependencies.includes('pydantic'));
    assert.ok(dependencies.includes('requests'));
    assert.ok(!dependencies.includes('-r base.txt'));
  });

  test('correctly parses Go go.mod', () => {
    const goMod = `
module github.com/acme/service

go 1.22

require (
\tgithub.com/gin-gonic/gin v1.9.1
\tgithub.com/google/uuid v1.6.0
)
`;

    const { dependencies, primaryLang } = parseManifest(goMod, 'go.mod');
    assert.equal(primaryLang, 'go');
    assert.ok(dependencies.includes('github.com/gin-gonic/gin'));
    assert.ok(dependencies.includes('github.com/google/uuid'));
  });
});
