-- ============================================================
-- WhatsApp Platform — Complete Database Schema
-- Compatible with: MySQL 8.0 (Hostinger) + PostgreSQL
-- Generated for: digitalatlus.in
-- ============================================================
-- NOTES:
--   • MySQL uses BIGINT AUTO_INCREMENT instead of SERIAL
--   • MySQL uses TINYINT(1) instead of BOOLEAN
--   • MySQL uses LONGTEXT instead of TEXT (for large payloads)
--   • DateTime functions differ: NOW() works on both
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ─── 1. USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(255) NOT NULL,
  `email`         VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `plan`          ENUM('free','starter','pro','enterprise') NOT NULL DEFAULT 'free',
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `avatar_url`    VARCHAR(500) NULL,
  `created_at`    DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`    DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. WORKSPACES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `workspaces` (
  `id`                              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                         BIGINT UNSIGNED NOT NULL,
  `name`                            VARCHAR(255) NOT NULL,
  -- WhatsApp Business API (WABA) credentials
  `whatsapp_phone_number`           VARCHAR(50) NULL COMMENT 'Display phone number e.g. +91 98765 43210',
  `whatsapp_phone_number_id`        VARCHAR(100) NULL COMMENT 'Meta Phone Number ID',
  `whatsapp_business_account_id`    VARCHAR(100) NULL COMMENT 'Meta WABA ID',
  `waba_access_token`               TEXT NULL COMMENT 'Meta System User permanent token (encrypted at rest recommended)',
  `webhook_verify_token`            VARCHAR(255) NULL,
  -- Billing / usage
  `monthly_message_limit`           INT NOT NULL DEFAULT 1000,
  `messages_sent_this_month`        INT NOT NULL DEFAULT 0,
  `billing_reset_date`              DATE NULL,
  `created_at`                      DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`                      DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_workspaces_user_id` (`user_id`),
  CONSTRAINT `fk_workspaces_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. CONTACTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contacts` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`  BIGINT UNSIGNED NOT NULL,
  `phone`         VARCHAR(30) NOT NULL COMMENT 'E.164 format: 919876543210',
  `name`          VARCHAR(255) NULL,
  `email`         VARCHAR(255) NULL,
  `notes`         TEXT NULL,
  `tags`          JSON NULL COMMENT 'Array of tag strings',
  `attributes`    JSON NULL COMMENT 'Custom key-value metadata',
  `opted_in`      TINYINT(1) NOT NULL DEFAULT 1,
  `opted_out_at`  DATETIME NULL,
  `last_seen`     DATETIME NULL,
  `created_at`    DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`    DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contacts_workspace_phone` (`workspace_id`, `phone`),
  INDEX `idx_contacts_workspace` (`workspace_id`),
  CONSTRAINT `fk_contacts_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. MESSAGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `messages` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`      BIGINT UNSIGNED NOT NULL,
  `contact_id`        BIGINT UNSIGNED NULL,
  `direction`         ENUM('outbound','inbound') NOT NULL,
  `to_phone`          VARCHAR(30) NULL,
  `from_phone`        VARCHAR(30) NULL,
  `type`              ENUM('text','template','image','video','document','audio','interactive','sticker','location','reaction') NOT NULL DEFAULT 'text',
  `content`           LONGTEXT NULL COMMENT 'Message text or JSON payload',
  `template_name`     VARCHAR(255) NULL,
  `media_url`         VARCHAR(1000) NULL,
  `waba_message_id`   VARCHAR(255) NULL COMMENT 'Meta message ID (wamid)',
  `status`            ENUM('queued','sent','delivered','read','failed','received') NOT NULL DEFAULT 'queued',
  `error_code`        VARCHAR(50) NULL,
  `error_message`     TEXT NULL,
  `campaign_id`       BIGINT UNSIGNED NULL,
  `automation_id`     BIGINT UNSIGNED NULL,
  `sent_at`           DATETIME NULL,
  `delivered_at`      DATETIME NULL,
  `read_at`           DATETIME NULL,
  `created_at`        DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_messages_workspace` (`workspace_id`),
  INDEX `idx_messages_contact` (`contact_id`),
  INDEX `idx_messages_waba_id` (`waba_message_id`),
  INDEX `idx_messages_status` (`status`),
  INDEX `idx_messages_created` (`created_at`),
  CONSTRAINT `fk_messages_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. TEMPLATES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `templates` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`  BIGINT UNSIGNED NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `category`      ENUM('MARKETING','UTILITY','AUTHENTICATION') NOT NULL DEFAULT 'MARKETING',
  `language`      VARCHAR(10) NOT NULL DEFAULT 'en',
  `status`        ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
  `header`        JSON NULL COMMENT '{type, text/media_url}',
  `body`          TEXT NOT NULL,
  `footer`        VARCHAR(255) NULL,
  `buttons`       JSON NULL COMMENT 'Array of button objects',
  `meta_template_id` VARCHAR(255) NULL,
  `created_at`    DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`    DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_templates_workspace` (`workspace_id`),
  CONSTRAINT `fk_templates_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. CAMPAIGNS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`      BIGINT UNSIGNED NOT NULL,
  `name`              VARCHAR(255) NOT NULL,
  `type`              ENUM('broadcast','sequence','drip') NOT NULL DEFAULT 'broadcast',
  `status`            ENUM('draft','scheduled','running','paused','completed','failed') NOT NULL DEFAULT 'draft',
  `template_id`       BIGINT UNSIGNED NULL,
  `target_filter`     JSON NULL COMMENT 'Contact filter criteria (tags, etc.)',
  `total_contacts`    INT NOT NULL DEFAULT 0,
  `sent_count`        INT NOT NULL DEFAULT 0,
  `delivered_count`   INT NOT NULL DEFAULT 0,
  `read_count`        INT NOT NULL DEFAULT 0,
  `failed_count`      INT NOT NULL DEFAULT 0,
  `scheduled_at`      DATETIME NULL,
  `started_at`        DATETIME NULL,
  `completed_at`      DATETIME NULL,
  `created_at`        DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`        DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_campaigns_workspace` (`workspace_id`),
  CONSTRAINT `fk_campaigns_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. AUTOMATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `automations` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`  BIGINT UNSIGNED NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `trigger`       VARCHAR(100) NOT NULL COMMENT 'e.g. message_received, keyword, event_fired',
  `trigger_config` JSON NULL,
  `actions`       JSON NOT NULL COMMENT 'Array of action steps',
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `run_count`     INT NOT NULL DEFAULT 0,
  `last_run_at`   DATETIME NULL,
  `created_at`    DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`    DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_automations_workspace` (`workspace_id`),
  INDEX `idx_automations_trigger` (`trigger`),
  CONSTRAINT `fk_automations_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. API KEYS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`  BIGINT UNSIGNED NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `key_hash`      VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 of the raw key',
  `key_prefix`    VARCHAR(8) NOT NULL COMMENT 'First 8 chars for display (e.g. wak_a1b2)',
  `permissions`   JSON NULL COMMENT 'Array: ["messages:send","contacts:read"]',
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `last_used_at`  DATETIME NULL,
  `expires_at`    DATETIME NULL,
  `created_at`    DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_api_keys_workspace` (`workspace_id`),
  INDEX `idx_api_keys_hash` (`key_hash`),
  CONSTRAINT `fk_api_keys_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 9. ANALYTICS EVENTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`  BIGINT UNSIGNED NOT NULL,
  `event`         VARCHAR(100) NOT NULL COMMENT 'e.g. message_sent, campaign_started, contact_opted_out',
  `contact_id`    BIGINT UNSIGNED NULL,
  `message_id`    BIGINT UNSIGNED NULL,
  `campaign_id`   BIGINT UNSIGNED NULL,
  `properties`    JSON NULL,
  `created_at`    DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_analytics_workspace` (`workspace_id`),
  INDEX `idx_analytics_event` (`event`),
  INDEX `idx_analytics_created` (`created_at`),
  CONSTRAINT `fk_analytics_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. INBOX CONVERSATIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `conversations` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workspace_id`      BIGINT UNSIGNED NOT NULL,
  `contact_id`        BIGINT UNSIGNED NOT NULL,
  `status`            ENUM('open','assigned','resolved','snoozed') NOT NULL DEFAULT 'open',
  `assigned_to`       BIGINT UNSIGNED NULL COMMENT 'User ID of assigned agent',
  `last_message_at`   DATETIME NULL,
  `last_message_id`   BIGINT UNSIGNED NULL,
  `unread_count`      INT NOT NULL DEFAULT 0,
  `tags`              JSON NULL,
  `created_at`        DATETIME NOT NULL DEFAULT NOW(),
  `updated_at`        DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  INDEX `idx_conversations_workspace` (`workspace_id`),
  INDEX `idx_conversations_contact` (`contact_id`),
  INDEX `idx_conversations_status` (`status`),
  CONSTRAINT `fk_conversations_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conversations_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── SEED: Default admin user (change password immediately after setup!) ────────
-- Password is bcrypt of 'Admin@1234' with 12 rounds
-- IMPORTANT: Change this password immediately after first login!
INSERT IGNORE INTO `users` (`name`, `email`, `password_hash`, `plan`) VALUES
('Admin', 'admin@digitalatlus.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdxoGUOC9B7gC6V0RGqHzVhJ8ZYS', 'pro');

-- Default workspace for admin (will be auto-created on first login via API)
-- Uncomment if you want to pre-create it:
-- INSERT IGNORE INTO `workspaces` (`user_id`, `name`) VALUES (1, 'DigitalAtlus Workspace');
