function toDiscordTimestamp(isoString) {
  const milliseconds = Date.parse(isoString);

  if (Number.isNaN(milliseconds)) {
    return 'Không xác định';
  }

  const epochSeconds = Math.floor(milliseconds / 1000);
  return `<t:${epochSeconds}:F> (<t:${epochSeconds}:R>)`;
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  toDiscordTimestamp,
  nowIso,
};
