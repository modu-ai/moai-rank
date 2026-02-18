ALTER TABLE "daily_aggregates" ALTER COLUMN "avg_efficiency" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "rankings" ALTER COLUMN "efficiency_score" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_salt" SET DEFAULT '37d9e557-73ad-4afb-b9ff-7a628ee1776a';--> statement-breakpoint
ALTER TABLE "daily_aggregates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "daily_aggregates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
CREATE INDEX "rankings_period_lookup_idx" ON "rankings" USING btree ("period_type","period_start","rank_position");--> statement-breakpoint
CREATE INDEX "sessions_user_ended_at_idx" ON "sessions" USING btree ("user_id","ended_at");