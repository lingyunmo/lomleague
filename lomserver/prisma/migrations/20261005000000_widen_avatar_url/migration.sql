-- Additive, backwards-compatible widening. No names, URLs, charset or rows are rewritten.
ALTER TABLE `User` MODIFY COLUMN `avatar` VARCHAR(2048) NOT NULL DEFAULT '/default-avatar.png', ALGORITHM=INPLACE, LOCK=NONE;
