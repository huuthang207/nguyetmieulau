const { SlashCommandBuilder } = require('discord.js');
const { canViewAttendance, isBotAdmin } = require('../utils/permissions');

const TOPICS = [
  { name: 'all', value: 'all' },
  { name: 'vote', value: 'vote' },
  { name: 'member', value: 'member' },
  { name: 'config', value: 'config' },
  { name: 'admin', value: 'admin' },
  { name: 'legacy', value: 'legacy' },
];

const HELP_SECTIONS = [
  {
    key: 'vote',
    title: '🗳️ Vote',
    commands: [
      { command: '/vote view', description: 'Xem vote hiện tại hoặc vote theo ID', permission: 'member' },
      { command: '/vote history', description: 'Xem lịch sử vote gần đây', permission: 'member' },
      { command: '/vote create', description: 'Tạo vote điểm danh mới', permission: 'admin' },
      { command: '/vote close', description: 'Đóng vote đang mở', permission: 'admin' },
      { command: '/vote export', description: 'Export attendance ra JSON', permission: 'admin' },
    ],
  },
  {
    key: 'member',
    title: '👤 Member',
    commands: [
      { command: '/member view', description: 'Xem hồ sơ của bạn', permission: 'member' },
      { command: '/member set-qr', description: 'Upload hoặc thay QR ngân hàng của bạn', permission: 'member' },
      { command: '/member remove-qr', description: 'Xóa QR ngân hàng của bạn', permission: 'member' },
      { command: '/member panel', description: 'Đăng panel quản lý hồ sơ', permission: 'admin' },
      { command: '/member view-other', description: 'Admin xem hồ sơ member khác', permission: 'admin' },
      { command: '/member set-other', description: 'Admin cập nhật hồ sơ member khác', permission: 'admin' },
      { command: '/member import', description: 'Import member profiles từ JSON', permission: 'admin' },
      { command: '/member export', description: 'Export member profiles ra JSON', permission: 'admin' },
    ],
  },
  {
    key: 'config',
    title: '⚙️ Config',
    commands: [
      { command: '/config channel', description: 'Đặt channel điểm danh', permission: 'admin' },
      { command: '/config member-role', description: 'Đặt role thành viên', permission: 'admin' },
      { command: '/config admin-role', description: 'Đặt role quản trị bot', permission: 'admin' },
    ],
  },
];

const LEGACY_MAPPINGS = [
  ['/vote-tao', '/vote create'],
  ['/vote-dong', '/vote close'],
  ['/vote-xem', '/vote view'],
  ['/vote-lich-su', '/vote history'],
  ['/profile export-attendance', '/vote export'],
  ['/vote-config channel', '/config channel'],
  ['/vote-config member-role', '/config member-role'],
  ['/vote-config admin-role', '/config admin-role'],
  ['/member-panel post', '/member panel'],
  ['/profile set-qr', '/member set-qr'],
  ['/profile remove-qr', '/member remove-qr'],
  ['/profile view-member', '/member view-other'],
  ['/profile set-member', '/member set-other'],
  ['/profile import-members', '/member import'],
  ['/profile export-members', '/member export'],
];

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Xem danh sách lệnh của bot')
  .addStringOption((option) => {
    option
      .setName('topic')
      .setDescription('Nhóm lệnh cần xem')
      .setRequired(false);

    for (const topic of TOPICS) {
      option.addChoices(topic);
    }

    return option;
  });

function canSeeCommand(command, access) {
  if (command.permission === 'admin') {
    return access.isAdmin;
  }

  if (command.permission === 'member') {
    return access.canView;
  }

  return true;
}

function formatCommand(command, { forceShowPermission = false } = {}) {
  const label = command.permission === 'admin'
    ? ' [Admin]'
    : command.permission === 'member'
      ? ' [Member]'
      : '';
  return `- \`${command.command}\`${forceShowPermission ? label : ''} — ${command.description}`;
}

function formatSection(section, access, { includeAdmin = false, forceShowPermission = false } = {}) {
  const commands = section.commands.filter((command) => includeAdmin || canSeeCommand(command, access));
  if (commands.length === 0) {
    return '';
  }

  return [`**${section.title}**`, ...commands.map((command) => formatCommand(command, { forceShowPermission }))].join('\n');
}

function buildLegacyHelp() {
  return [
    '**🔁 Lệnh cũ đã được đổi**',
    ...LEGACY_MAPPINGS.map(([oldCommand, newCommand]) => `- \`${oldCommand}\` → \`${newCommand}\``),
  ].join('\n');
}

function buildTopicHelp(topic, access) {
  if (topic === 'legacy') {
    return buildLegacyHelp();
  }

  if (topic === 'admin') {
    return [
      '**🔐 Lệnh admin**',
      ...HELP_SECTIONS.map((section) => formatSection(section, access, { includeAdmin: true, forceShowPermission: true }))
        .filter(Boolean),
      access.isAdmin ? '' : '_Bạn cần quyền admin để dùng các lệnh [Admin]._',
    ].filter(Boolean).join('\n\n');
  }

  const sections = topic === 'all'
    ? HELP_SECTIONS
    : HELP_SECTIONS.filter((section) => section.key === topic);

  return sections.map((section) => formatSection(section, access, {
    includeAdmin: access.isAdmin,
    forceShowPermission: access.isAdmin,
  })).filter(Boolean).join('\n\n') || 'Không có lệnh phù hợp với quyền hiện tại của bạn trong topic này.';
}

function buildDefaultHelp(access) {
  const intro = [
    '**📘 Danh sách lệnh bot**',
    'Dùng `/help topic:<nhóm>` để xem chi tiết: `vote`, `member`, `config`, `admin`, hoặc `legacy`.',
  ];

  if (!access.canView && !access.isAdmin) {
    intro.push('_Bạn chưa có member/admin role, nên chỉ xem được hướng dẫn cơ bản. Hãy liên hệ admin nếu cần quyền dùng bot._');
  } else if (!access.isAdmin) {
    intro.push('_Một số lệnh admin được ẩn khỏi overview. Dùng `/help topic:admin` để xem danh sách admin commands._');
  }

  const body = HELP_SECTIONS.map((section) => formatSection(section, access, {
    includeAdmin: access.isAdmin,
    forceShowPermission: access.isAdmin,
  })).filter(Boolean);

  return [...intro, ...body].join('\n\n');
}

async function execute(interaction, context) {
  const settings = await context.services.settingsService.getSettings(interaction.guildId);
  const access = {
    isAdmin: isBotAdmin(interaction.member, settings),
    canView: canViewAttendance(interaction.member, settings),
  };
  const topic = interaction.options.getString('topic') || null;

  await interaction.reply({
    content: topic ? buildTopicHelp(topic, access) : buildDefaultHelp(access),
    ephemeral: true,
  });
}

module.exports = {
  HELP_SECTIONS,
  LEGACY_MAPPINGS,
  buildDefaultHelp,
  buildTopicHelp,
  data,
  execute,
};
