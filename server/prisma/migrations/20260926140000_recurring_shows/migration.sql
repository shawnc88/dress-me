-- Standing weekly shows: the retention loop is a show people can count on.
ALTER TABLE "Stream" ADD COLUMN "recurrenceRule" TEXT;
