const { PermissionFlagsBits } = require('discord.js');

function hasAdministrator(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}

function hasConfiguredRole(member, roleId) {
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

function isBotAdmin(member, settings) {
  return hasAdministrator(member) || hasConfiguredRole(member, settings?.admin_role_id);
}

function canVote(member, settings) {
  return hasConfiguredRole(member, settings?.member_role_id);
}

function canViewAttendance(member, settings) {
  return isBotAdmin(member, settings) || hasConfiguredRole(member, settings?.member_role_id);
}

module.exports = {
  hasAdministrator,
  hasConfiguredRole,
  isBotAdmin,
  canVote,
  canViewAttendance,
};
