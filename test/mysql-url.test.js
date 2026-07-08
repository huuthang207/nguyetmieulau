const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMySqlUrl } = require('../src/db/mysql-url');

test('parseMySqlUrl supports JDBC URL with query credentials', () => {
  const config = parseMySqlUrl('jdbc:mysql://example.com:3307/mydb?user=myuser&password=mypass');

  assert.equal(config.host, 'example.com');
  assert.equal(config.port, 3307);
  assert.equal(config.database, 'mydb');
  assert.equal(config.user, 'myuser');
  assert.equal(config.password, 'mypass');
  assert.equal(config.ssl, undefined);
});

test('parseMySqlUrl supports URL encoded credentials in JDBC query params', () => {
  const config = parseMySqlUrl('jdbc:mysql://example.com:3307/mydb?user=u182031_JzlWSyLMZA&password=R9VXq8bhu%40xYi7F0T%3DGsgR2%3D');

  assert.equal(config.user, 'u182031_JzlWSyLMZA');
  assert.equal(config.password, 'R9VXq8bhu@xYi7F0T=GsgR2=');
});

test('parseMySqlUrl supports URL encoded credentials in JDBC authority', () => {
  const config = parseMySqlUrl('jdbc:mysql://u182031_JzlWSyLMZA:R9VXq8bhu%40xYi7F0T%3DGsgR2%3D@103.228.36.238:3307/s182031_user');

  assert.equal(config.host, '103.228.36.238');
  assert.equal(config.port, 3307);
  assert.equal(config.database, 's182031_user');
  assert.equal(config.user, 'u182031_JzlWSyLMZA');
  assert.equal(config.password, 'R9VXq8bhu@xYi7F0T=GsgR2=');
});

test('parseMySqlUrl supports standard mysql URL credentials', () => {
  const config = parseMySqlUrl('mysql://user:pass@example.com:3306/appdb');

  assert.equal(config.host, 'example.com');
  assert.equal(config.port, 3306);
  assert.equal(config.database, 'appdb');
  assert.equal(config.user, 'user');
  assert.equal(config.password, 'pass');
});

test('parseMySqlUrl supports SSL flags', () => {
  const config = parseMySqlUrl('jdbc:mysql://example.com:3306/appdb?user=user&password=pass&useSSL=true');

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test('parseMySqlUrl rejects missing database', () => {
  assert.throws(
    () => parseMySqlUrl('jdbc:mysql://example.com:3306?user=user&password=pass'),
    /missing database name/,
  );
});
