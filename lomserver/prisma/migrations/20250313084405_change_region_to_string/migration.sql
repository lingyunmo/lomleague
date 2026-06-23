-- AlterTable
ALTER TABLE `ForumPost` ADD COLUMN `region` VARCHAR(191) NULL DEFAULT '未知',
    ADD COLUMN `title` VARCHAR(191) NOT NULL DEFAULT '未命名帖子';

-- AlterTable
ALTER TABLE `ForumReply` ADD COLUMN `region` VARCHAR(191) NULL DEFAULT '未知';
