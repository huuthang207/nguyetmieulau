const MON_PHAI_VALUES = [
  'Toái Mộng',
  'Huyết Hà',
  'Thiết Y',
  'Thần Tương',
  'Tố Vấn',
  'Long Ngâm',
  'Cửu Linh',
];

const MON_PHAI_KEYS = {
  'Toái Mộng': 'toai-mong',
  'Huyết Hà': 'huyet-ha',
  'Thiết Y': 'thiet-y',
  'Thần Tương': 'than-tuong',
  'Tố Vấn': 'to-van',
  'Long Ngâm': 'long-ngam',
  'Cửu Linh': 'cuu-linh',
};

const MON_PHAI_EMOJIS = {
  'Toái Mộng': '<:toaimong:1522047569847386132>',
  'Huyết Hà': '<:huyetha:1522047460619325450>',
  'Thiết Y': '<:thiety:1522047547634618428>',
  'Thần Tương': '<:thantuong:1522047527778521278>',
  'Tố Vấn': '<:tovan:1522047588553986190>',
  'Long Ngâm': '<:longngam:1522047497391046778>',
  'Cửu Linh': '<:cuulinh:1522047429921210418>',
};

const MON_PHAI_CHOICES = MON_PHAI_VALUES.map((value) => ({
  name: value,
  value,
}));

function isValidMonPhai(value) {
  return MON_PHAI_VALUES.includes(value);
}

function formatMonPhaiWithEmoji(monPhai) {
  const emoji = MON_PHAI_EMOJIS[monPhai];
  return emoji ? `${emoji} ${monPhai}` : monPhai;
}

function getMonPhaiKey(monPhai) {
  return MON_PHAI_KEYS[monPhai] || null;
}

function getMonPhaiFromKey(key) {
  const entry = Object.entries(MON_PHAI_KEYS).find(([, value]) => value === key);
  return entry ? entry[0] : null;
}

module.exports = {
  MON_PHAI_VALUES,
  MON_PHAI_KEYS,
  MON_PHAI_EMOJIS,
  MON_PHAI_CHOICES,
  isValidMonPhai,
  formatMonPhaiWithEmoji,
  getMonPhaiKey,
  getMonPhaiFromKey,
};
