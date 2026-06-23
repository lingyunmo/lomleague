-- Drop existing foreign keys to change ON DELETE behavior
ALTER TABLE `ForumPost` DROP FOREIGN KEY `ForumPost_userId_fkey`;
ALTER TABLE `ForumReply` DROP FOREIGN KEY `ForumReply_postId_fkey`;
ALTER TABLE `ForumReply` DROP FOREIGN KEY `ForumReply_userId_fkey`;
ALTER TABLE `Article` DROP FOREIGN KEY `Article_userId_fkey`;

-- Re-add foreign keys with cascade deletes
ALTER TABLE `ForumPost` ADD CONSTRAINT `ForumPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ForumReply` ADD CONSTRAINT `ForumReply_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `ForumPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ForumReply` ADD CONSTRAINT `ForumReply_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Article` ADD CONSTRAINT `Article_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes on foreign keys
CREATE INDEX `ForumPost_userId_idx` ON `ForumPost`(`userId`);
CREATE INDEX `ForumReply_postId_idx` ON `ForumReply`(`postId`);
CREATE INDEX `ForumReply_userId_idx` ON `ForumReply`(`userId`);
CREATE INDEX `Article_userId_idx` ON `Article`(`userId`);

-- Add indexes on sort columns
CREATE INDEX `ForumPost_updatedAt_idx` ON `ForumPost`(`updatedAt`);
CREATE INDEX `Article_createdAt_idx` ON `Article`(`createdAt`);
CREATE INDEX `Article_updatedAt_idx` ON `Article`(`updatedAt`);
