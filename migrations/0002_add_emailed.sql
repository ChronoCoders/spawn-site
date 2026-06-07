-- Tracks whether the launch broadcast has been sent to each subscriber.
ALTER TABLE subscribers ADD COLUMN emailed INTEGER NOT NULL DEFAULT 0;
