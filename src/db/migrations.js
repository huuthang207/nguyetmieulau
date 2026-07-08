const SQLITE_MIGRATIONS = [
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

const MYSQL_MIGRATIONS = [
  {
    id: '001-initial-schema',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(191) PRIMARY KEY,
        applied_at VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      `
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(32) PRIMARY KEY,
        admin_role_id VARCHAR(32),
        member_role_id VARCHAR(32),
        attendance_channel_id VARCHAR(32),
        updated_at VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      `
      CREATE TABLE IF NOT EXISTS votes (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(32) NOT NULL,
        channel_id VARCHAR(32) NOT NULL,
        message_id VARCHAR(32),
        title VARCHAR(191) NOT NULL,
        event_time VARCHAR(191) NOT NULL,
        description TEXT,
        status VARCHAR(16) NOT NULL,
        created_by VARCHAR(32) NOT NULL,
        created_at VARCHAR(32) NOT NULL,
        updated_at VARCHAR(32) NOT NULL,
        closed_at VARCHAR(32)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      `
      CREATE TABLE IF NOT EXISTS vote_responses (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        vote_id BIGINT NOT NULL,
        user_id VARCHAR(32) NOT NULL,
        choice VARCHAR(16) NOT NULL,
        created_at VARCHAR(32) NOT NULL,
        updated_at VARCHAR(32) NOT NULL,
        UNIQUE KEY idx_vote_responses_vote_user (vote_id, user_id),
        CONSTRAINT fk_vote_responses_vote_id FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      'CREATE INDEX idx_votes_guild_status ON votes(guild_id, status, created_at)',
      'CREATE INDEX idx_votes_guild_created_at ON votes(guild_id, created_at)',
      'CREATE INDEX idx_vote_responses_vote_id ON vote_responses(vote_id)',
    ],
  },
  {
    id: '002-member-profiles-and-response-snapshots',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS member_profiles (
        guild_id VARCHAR(32) NOT NULL,
        user_id VARCHAR(32) NOT NULL,
        ingame_name VARCHAR(191) NOT NULL,
        mon_phai VARCHAR(191) NOT NULL,
        updated_at VARCHAR(32) NOT NULL,
        PRIMARY KEY (guild_id, user_id),
        UNIQUE KEY idx_member_profiles_guild_ingame_name (guild_id, ingame_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      'ALTER TABLE vote_responses ADD COLUMN snapshot_ingame_name VARCHAR(191) NULL',
      'ALTER TABLE vote_responses ADD COLUMN snapshot_mon_phai VARCHAR(191) NULL',
    ],
  },
];

const MIGRATIONS_BY_DIALECT = {
  sqlite: SQLITE_MIGRATIONS,
  mysql: MYSQL_MIGRATIONS,
};

module.exports = {
  MIGRATIONS: SQLITE_MIGRATIONS,
  MIGRATIONS_BY_DIALECT,
};
