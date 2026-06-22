-- Drop existing foreign keys to change ON DELETE behavior
ALTER TABLE `forumpost` DROP FOREIGN KEY `ForumPost_userId_fkey`;
ALTER TABLE `forumreply` DROP FOREIGN KEY `ForumReply_postId_fkey`;
ALTER TABLE `forumreply` DROP FOREIGN KEY `ForumReply_userId_fkey`;
ALTER TABLE `article` DROP FOREIGN KEY `Article_userId_fkey`;

-- Re-add foreign keys with cascade deletes
ALTER TABLE `forumpost` ADD CONSTRAINT `ForumPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `forumreply` ADD CONSTRAINT `ForumReply_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `forumpost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `forumreply` ADD CONSTRAINT `ForumReply_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `article` ADD CONSTRAINT `Article_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes on foreign keys
CREATE INDEX `ForumPost_userId_idx` ON `forumpost`(`userId`);
CREATE INDEX `ForumReply_postId_idx` ON `forumreply`(`postId`);
CREATE INDEX `ForumReply_userId_idx` ON `forumreply`(`userId`);
CREATE INDEX `Article_userId_idx` ON `article`(`userId`);

-- Add indexes on sort columns
CREATE INDEX `ForumPost_updatedAt_idx` ON `forumpost`(`updatedAt`);
CREATE INDEX `Article_createdAt_idx` ON `article`(`createdAt`);
CREATE INDEX `Article_updatedAt_idx` ON `article`(`updatedAt`);
