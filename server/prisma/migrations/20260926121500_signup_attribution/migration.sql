-- First-touch attribution (utm/referrer/invite) stored at signup so
-- creator-driven and channel-driven signups are measurable.
ALTER TABLE "User" ADD COLUMN "signupAttribution" JSONB;
