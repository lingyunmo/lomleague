-- AlterTable
ALTER TABLE `forumpost` ADD COLUMN `region` VARCHAR(191) NULL DEFAULT '未知',
    ADD COLUMN `title` VARCHAR(191) NOT NULL DEFAULT '未命名帖子';

-- AlterTable
ALTER TABLE `forumreply` ADD COLUMN `region` VARCHAR(191) NULL DEFAULT '未知';
