function stripJdbcPrefix(value) {
  return value.startsWith('jdbc:') ? value.slice('jdbc:'.length) : value;
}

function readBoolean(value) {
  if (value == null) {
    return null;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseMySqlUrl(rawUrl, options = {}) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    throw new Error('Missing MySQL database URL.');
  }

  const normalized = stripJdbcPrefix(value);
  const url = new URL(normalized);

  if (url.protocol !== 'mysql:') {
    throw new Error('MySQL database URL must use mysql:// or jdbc:mysql://.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const user = url.username || url.searchParams.get('user') || '';
  const password = url.password || url.searchParams.get('password') || '';

  if (!url.hostname) {
    throw new Error('MySQL database URL is missing host.');
  }

  if (!database) {
    throw new Error('MySQL database URL is missing database name.');
  }

  if (!user) {
    throw new Error('MySQL database URL is missing user.');
  }

  const sslFromUrl = readBoolean(url.searchParams.get('ssl'))
    ?? readBoolean(url.searchParams.get('useSSL'))
    ?? readBoolean(url.searchParams.get('requireSSL'));
  const ssl = options.ssl ?? sslFromUrl ?? false;
  const rejectUnauthorized = options.sslRejectUnauthorized ?? true;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    database,
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    ssl: ssl ? { rejectUnauthorized } : undefined,
  };
}

module.exports = {
  parseMySqlUrl,
};
