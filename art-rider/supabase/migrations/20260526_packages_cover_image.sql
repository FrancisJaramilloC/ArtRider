-- Add cover_image_url to packages table
-- Required for the package form wizard photo upload step
ALTER TABLE packages ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
