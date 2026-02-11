ALTER TABLE "sessions" ADD COLUMN "device_id" varchar(128);--> statement-breakpoint
CREATE INDEX "daily_aggregates_user_date_idx" ON "daily_aggregates" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_aggregates_user_id_idx" ON "daily_aggregates" USING btree ("user_id");
