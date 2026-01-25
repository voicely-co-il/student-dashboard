-- Add missing exercise categories to the enum
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'pitch';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'resonance';
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'range';
