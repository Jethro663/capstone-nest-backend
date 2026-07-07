import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const appVersions = pgTable(
  'app_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: text('platform').notNull().default('android'),
    versionCode: integer('version_code').notNull(),
    minSupportedVersionCode: integer('min_supported_version_code').notNull(),
    nativeVersion: text('native_version').notNull(),
    otaRuntimeVersion: text('ota_runtime_version').notNull(),
    apkDownloadUrl: text('apk_download_url').notNull(),
    apkSha256: text('apk_sha256'),
    apkSizeBytes: integer('apk_size_bytes'),
    isForceUpdate: boolean('is_force_update').notNull().default(false),
    requiresFullApk: boolean('requires_full_apk').notNull().default(false),
    releaseNotes: text('release_notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    platformIdx: index('app_versions_platform_idx').on(table.platform),
    versionCodeIdx: index('app_versions_version_code_idx').on(
      table.versionCode,
    ),
  }),
);
