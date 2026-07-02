const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasAdministrator,
  hasConfiguredRole,
  isBotAdmin,
  canVote,
  canViewAttendance,
} = require('../src/utils/permissions');

function createMember({ isAdministrator = false, roleIds = [] } = {}) {
  return {
    permissions: {
      has(permission) {
        return isAdministrator && permission === permission;
      },
    },
    roles: {
      cache: new Map(roleIds.map((roleId) => [roleId, { id: roleId }])),
    },
  };
}

test('permission helpers respect administrator and configured roles', () => {
  const settings = {
    admin_role_id: 'admin-role',
    member_role_id: 'member-role',
  };

  const adminMember = createMember({ isAdministrator: true });
  const configuredAdmin = createMember({ roleIds: ['admin-role'] });
  const member = createMember({ roleIds: ['member-role'] });
  const guest = createMember();

  assert.equal(hasAdministrator(adminMember), true);
  assert.equal(hasConfiguredRole(configuredAdmin, 'admin-role'), true);
  assert.equal(isBotAdmin(adminMember, settings), true);
  assert.equal(isBotAdmin(configuredAdmin, settings), true);
  assert.equal(canVote(member, settings), true);
  assert.equal(canVote(guest, settings), false);
  assert.equal(canViewAttendance(member, settings), true);
  assert.equal(canViewAttendance(configuredAdmin, settings), true);
  assert.equal(canViewAttendance(guest, settings), false);
});
