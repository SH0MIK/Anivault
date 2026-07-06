PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS `activity_log`;

CREATE TABLE `activity_log` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER DEFAULT NULL,
  `action` TEXT NOT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` TEXT DEFAULT NULL,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `anime_dub_status`;

CREATE TABLE `anime_dub_status` (
  `anime_id` INTEGER NOT NULL PRIMARY KEY,
  `has_dub` INTEGER NOT NULL DEFAULT 0,
  `confirm_count` INTEGER NOT NULL DEFAULT 0,
  `deny_count` INTEGER NOT NULL DEFAULT 0,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `anime_images`;

CREATE TABLE `anime_images` (
  `anime_id` INTEGER NOT NULL PRIMARY KEY,
  `anime_title` TEXT DEFAULT NULL,
  `image_url` TEXT NOT NULL,
  `source` TEXT NOT NULL DEFAULT 'admin',
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `anime_list`;

CREATE TABLE `anime_list` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `anime_id` INTEGER NOT NULL,
  `anime_title` TEXT NOT NULL,
  `anime_image` TEXT DEFAULT NULL,
  `anime_episodes` INTEGER DEFAULT 0,
  `status` TEXT CHECK(`status` IN ('watching','completed','plan_to_watch','dropped','on_hold')) DEFAULT 'plan_to_watch',
  `episodes_watched` INTEGER DEFAULT 0,
  `score` INTEGER DEFAULT NULL CHECK (`score` between 1 and 10),
  `review` TEXT DEFAULT NULL,
  `started_at` TEXT DEFAULT NULL,
  `completed_at` TEXT DEFAULT NULL,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP,
  `genres` TEXT DEFAULT NULL
);

DROP TABLE IF EXISTS `anime_mal_map`;

CREATE TABLE `anime_mal_map` (
  `mal_id` INTEGER NOT NULL PRIMARY KEY,
  `anilist_id` INTEGER NOT NULL
);

DROP TABLE IF EXISTS `announcements`;

CREATE TABLE `announcements` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `title` TEXT NOT NULL,
  `content` TEXT NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `is_active` INTEGER DEFAULT 1,
  `created_by` INTEGER NOT NULL,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `badges`;

CREATE TABLE `badges` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `icon_text` TEXT DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `color` TEXT NOT NULL DEFAULT '#e8453c',
  `is_animated` INTEGER NOT NULL DEFAULT 0,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `comment_likes`;

CREATE TABLE `comment_likes` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `comment_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `episode_overrides`;

CREATE TABLE `episode_overrides` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `anime_id` INTEGER NOT NULL,
  `episode_num` INTEGER NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `synopsis` TEXT DEFAULT NULL,
  `watch_links` TEXT DEFAULT NULL CHECK (json_valid(`watch_links`)),
  `updated_by` INTEGER DEFAULT NULL,
  `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `episode_videos`;

CREATE TABLE `episode_videos` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `anime_id` INTEGER NOT NULL,
  `episode_num` INTEGER NOT NULL,
  `anime_title` TEXT DEFAULT NULL,
  `title` TEXT DEFAULT NULL,
  `video_type` TEXT NOT NULL DEFAULT 'Review',
  `platform` TEXT NOT NULL DEFAULT 'youtube',
  `video_url` TEXT DEFAULT NULL,
  `embed_code` TEXT DEFAULT NULL,
  `qualities` TEXT DEFAULT NULL CHECK (json_valid(`qualities`)),
  `description` TEXT DEFAULT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `created_by` INTEGER DEFAULT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `favorites`;

CREATE TABLE `favorites` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `anime_id` INTEGER NOT NULL,
  `anime_title` TEXT NOT NULL,
  `anime_image` TEXT DEFAULT NULL,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `feed_comments`;

CREATE TABLE `feed_comments` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `post_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  `parent_id` INTEGER DEFAULT NULL
);

DROP TABLE IF EXISTS `feed_likes`;

CREATE TABLE `feed_likes` (
  `post_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`)
);

DROP TABLE IF EXISTS `feed_post_tags`;

CREATE TABLE `feed_post_tags` (
  `post_id` INTEGER NOT NULL,
  `tag` TEXT NOT NULL,
  PRIMARY KEY (`post_id`, `tag`)
);

DROP TABLE IF EXISTS `feed_posts`;

CREATE TABLE `feed_posts` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  `image_url` TEXT DEFAULT NULL,
  `pinned` INTEGER NOT NULL DEFAULT 0,
  `public_id` char(36) DEFAULT NULL
);

DROP TABLE IF EXISTS `follows`;

CREATE TABLE `follows` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `follower_id` INTEGER NOT NULL,
  `following_id` INTEGER NOT NULL,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `hosting_survey_votes`;

CREATE TABLE `hosting_survey_votes` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `vote` TEXT CHECK(`vote` IN ('ads','donate')) NOT NULL,
  `voted_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `miruro_stream_cache`;

CREATE TABLE `miruro_stream_cache` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `mal_id` INTEGER NOT NULL,
  `episode_num` smallint(5) NOT NULL,
  `audio` TEXT CHECK(`audio` IN ('sub','dub','raw')) DEFAULT 'sub' NOT NULL,
  `server` TEXT NOT NULL,
  `m3u8` TEXT NOT NULL,
  `proxy_url` TEXT DEFAULT NULL,
  `saved_by` INTEGER DEFAULT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `notifications`;

CREATE TABLE `notifications` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `actor_id` INTEGER NOT NULL,
  `type` TEXT NOT NULL,
  `entity_id` INTEGER DEFAULT NULL,
  `entity_meta` TEXT DEFAULT NULL,
  `is_read` INTEGER DEFAULT 0,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `post_comments`;

CREATE TABLE `post_comments` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `post_id` char(36) NOT NULL,
  `user_id` INTEGER NOT NULL,
  `parent_id` INTEGER DEFAULT NULL,
  `body` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `post_likes`;

CREATE TABLE `post_likes` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `post_id` char(36) NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `posts`;

CREATE TABLE `posts` (
  `id` char(36) NOT NULL PRIMARY KEY,
  `user_id` INTEGER NOT NULL,
  `body` TEXT NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `like_count` INTEGER NOT NULL DEFAULT 0,
  `comment_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `review_likes`;

CREATE TABLE `review_likes` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `review_id` INTEGER NOT NULL,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `reviews`;

CREATE TABLE `reviews` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER NOT NULL,
  `anime_id` INTEGER NOT NULL,
  `anime_title` TEXT NOT NULL,
  `score` INTEGER NOT NULL CHECK (`score` between 1 and 10),
  `review_text` TEXT NOT NULL,
  `likes` INTEGER DEFAULT 0,
  `is_visible` INTEGER DEFAULT 1,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP,
  `likes_count` INTEGER NOT NULL DEFAULT 0
);

DROP TABLE IF EXISTS `settings`;

CREATE TABLE `settings` (
  `key` TEXT NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL DEFAULT '',
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `site_feedback`;

CREATE TABLE `site_feedback` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER DEFAULT NULL,
  `ip_address` TEXT NOT NULL DEFAULT '',
  `rating` INTEGER DEFAULT NULL,
  `comment` TEXT DEFAULT NULL,
  `page` TEXT DEFAULT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `user_badges`;

CREATE TABLE `user_badges` (
  `user_id` INTEGER NOT NULL,
  `badge_id` INTEGER NOT NULL,
  `assigned_by` INTEGER DEFAULT NULL,
  `assigned_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `badge_id`)
);

DROP TABLE IF EXISTS `user_follows`;

CREATE TABLE `user_follows` (
  `follower_id` INTEGER NOT NULL,
  `following_id` INTEGER NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`follower_id`, `following_id`)
);

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `uid` TEXT DEFAULT NULL,
  `username` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `password_hash` TEXT NOT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `role` TEXT CHECK(`role` IN ('user','admin','owner')) DEFAULT 'user',
  `is_active` INTEGER DEFAULT 1,
  `created_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` TEXT NULL DEFAULT NULL,
  `google_id` TEXT DEFAULT NULL,
  `discord_id` TEXT DEFAULT NULL
);

DROP TABLE IF EXISTS `watch_history`;

CREATE TABLE `watch_history` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `user_id` INTEGER DEFAULT NULL,
  `anime_id` INTEGER NOT NULL,
  `episode_num` INTEGER NOT NULL,
  `anime_title` TEXT DEFAULT NULL,
  `anime_image` TEXT DEFAULT NULL,
  `watched_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ep_title` TEXT DEFAULT NULL,
  `ep_thumb` TEXT DEFAULT NULL,
  `watch_time` INTEGER NOT NULL DEFAULT 0,
  `episode_duration` INTEGER NOT NULL DEFAULT 0,
  `guest_id` TEXT DEFAULT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS `idx_activity_user` ON `activity_log` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_anime_images_title` ON `anime_images` (`anime_title`);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_user_anime` ON `anime_list` (`user_id`, `anime_id`);
CREATE INDEX IF NOT EXISTS `idx_anime_list_user` ON `anime_list` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_anime_list_status` ON `anime_list` (`user_id`, `status`);
CREATE INDEX IF NOT EXISTS `created_by` ON `announcements` (`created_by`);
CREATE INDEX IF NOT EXISTS `idx_badges_sort` ON `badges` (`sort_order`, `name`);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_comment_like` ON `comment_likes` (`comment_id`, `user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_anime_ep` ON `episode_overrides` (`anime_id`, `episode_num`);
CREATE INDEX IF NOT EXISTS `idx_anime_id` ON `episode_overrides` (`anime_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_anime_ep` ON `episode_videos` (`anime_id`, `episode_num`);
CREATE INDEX IF NOT EXISTS `idx_anime` ON `episode_videos` (`anime_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_fav` ON `favorites` (`user_id`, `anime_id`);
CREATE INDEX IF NOT EXISTS `post_id` ON `feed_comments` (`post_id`);
CREATE INDEX IF NOT EXISTS `idx_fpt_tag` ON `feed_post_tags` (`tag`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_fp_public_id` ON `feed_posts` (`public_id`);
CREATE INDEX IF NOT EXISTS `user_id` ON `feed_posts` (`user_id`);
CREATE INDEX IF NOT EXISTS `created_at` ON `feed_posts` (`created_at`);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_follow` ON `follows` (`follower_id`, `following_id`);
CREATE INDEX IF NOT EXISTS `idx_follows_follower` ON `follows` (`follower_id`);
CREATE INDEX IF NOT EXISTS `idx_follows_following` ON `follows` (`following_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `user_id` ON `hosting_survey_votes` (`user_id`);
CREATE INDEX IF NOT EXISTS `vote` ON `hosting_survey_votes` (`vote`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_stream` ON `miruro_stream_cache` (`mal_id`, `episode_num`, `audio`, `server`);
CREATE INDEX IF NOT EXISTS `idx_anime` ON `miruro_stream_cache` (`mal_id`);
CREATE INDEX IF NOT EXISTS `idx_active` ON `miruro_stream_cache` (`is_active`);
CREATE INDEX IF NOT EXISTS `actor_id` ON `notifications` (`actor_id`);
CREATE INDEX IF NOT EXISTS `idx_notif_user` ON `notifications` (`user_id`, `is_read`);
CREATE INDEX IF NOT EXISTS `idx_notif_created` ON `notifications` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_pc_post` ON `post_comments` (`post_id`);
CREATE INDEX IF NOT EXISTS `idx_pc_parent` ON `post_comments` (`parent_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_post_like` ON `post_likes` (`post_id`, `user_id`);
CREATE INDEX IF NOT EXISTS `idx_posts_user` ON `posts` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_posts_created` ON `posts` (`created_at`);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_like` ON `review_likes` (`user_id`, `review_id`);
CREATE INDEX IF NOT EXISTS `review_id` ON `review_likes` (`review_id`);
CREATE INDEX IF NOT EXISTS `user_id` ON `reviews` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_reviews_anime` ON `reviews` (`anime_id`);
CREATE INDEX IF NOT EXISTS `idx_fb_user` ON `site_feedback` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_fb_ip` ON `site_feedback` (`ip_address`);
CREATE INDEX IF NOT EXISTS `idx_fb_date` ON `site_feedback` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_user_badges_badge` ON `user_badges` (`badge_id`);
CREATE INDEX IF NOT EXISTS `idx_uf_following` ON `user_follows` (`following_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `username` ON `users` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `email` ON `users` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `google_id` ON `users` (`google_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `discord_id` ON `users` (`discord_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uid` ON `users` (`uid`);
CREATE INDEX IF NOT EXISTS `idx_users_google_id` ON `users` (`google_id`);
CREATE INDEX IF NOT EXISTS `idx_users_discord_id` ON `users` (`discord_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_user_anime` ON `watch_history` (`user_id`, `anime_id`);
CREATE INDEX IF NOT EXISTS `idx_user_watched` ON `watch_history` (`user_id`, `watched_at`);
CREATE INDEX IF NOT EXISTS `idx_guest_watched` ON `watch_history` (`guest_id`, `watched_at`);
