const MIGRATIONS = [
  {
    id: '001-initial-schema',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        admin_role_id TEXT,
        member_role_id TEXT,
        attendance_channel_id TEXT,
        updated_at TEXT NOT NULL
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        title TEXT NOT NULL,
        event_time TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        closed_at TEXT
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS vote_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vote_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        choice TEXT NOT NULL CHECK (choice IN ('join', 'reserve', 'absent')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(vote_id, user_id),
        FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE
      )
      `,
      'CREATE INDEX IF NOT EXISTS idx_votes_guild_status ON votes(guild_id, status, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_votes_guild_created_at ON votes(guild_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_vote_responses_vote_id ON vote_responses(vote_id)',
    ],
  },
  {
    id: '002-member-profiles-and-response-snapshots',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS member_profiles (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        ingame_name TEXT NOT NULL,
        mon_phai TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (guild_id, user_id)
      )
      `,
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_member_profiles_guild_ingame_name ON member_profiles(guild_id, ingame_name)',
      'ALTER TABLE vote_responses ADD COLUMN snapshot_ingame_name TEXT',
      'ALTER TABLE vote_responses ADD COLUMN snapshot_mon_phai TEXT',
    ],
  },
];

module.exports = {
  MIGRATIONS,
};
