CREATE TABLE "daily_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"date" date NOT NULL,
	"total_input_tokens" bigint DEFAULT 0,
	"total_output_tokens" bigint DEFAULT 0,
	"total_cache_tokens" bigint DEFAULT 0,
	"session_count" integer DEFAULT 0,
	"avg_efficiency" numeric(5, 4),
	"composite_score" numeric(12, 4),
	CONSTRAINT "daily_aggregates_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"period_type" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"rank_position" integer NOT NULL,
	"total_tokens" bigint NOT NULL,
	"composite_score" numeric(12, 4) NOT NULL,
	"session_count" integer NOT NULL,
	"efficiency_score" numeric(5, 4),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "rankings_user_id_period_type_period_start_unique" UNIQUE("user_id","period_type","period_start")
);
--> statement-breakpoint
CREATE TABLE "security_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"server_session_hash" varchar(64) NOT NULL,
	"anonymous_project_id" varchar(16),
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer,
	"model_name" varchar(50),
	"turn_count" integer,
	"tool_usage" jsonb,
	"code_metrics" jsonb,
	"model_usage_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_server_session_hash_unique" UNIQUE("server_session_hash")
);
--> statement-breakpoint
CREATE TABLE "token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_creation_tokens" bigint DEFAULT 0,
	"cache_read_tokens" bigint DEFAULT 0,
	"recorded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"github_id" varchar(255) NOT NULL,
	"github_username" varchar(255) NOT NULL,
	"github_avatar_url" text,
	"api_key_hash" varchar(64) NOT NULL,
	"api_key_prefix" varchar(32) NOT NULL,
	"user_salt" varchar(64) DEFAULT 'de6ac9d9-e4e5-4dcc-9465-813da916221a' NOT NULL,
	"privacy_mode" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "daily_aggregates" ADD CONSTRAINT "daily_aggregates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_log" ADD CONSTRAINT "security_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rankings_period_type_idx" ON "rankings" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "rankings_rank_position_idx" ON "rankings" USING btree ("period_type","rank_position");--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "security_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "security_audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "security_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "token_usage_user_id_idx" ON "token_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "token_usage_recorded_at_idx" ON "token_usage" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "token_usage_user_recorded_idx" ON "token_usage" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "users_api_key_hash_idx" ON "users" USING btree ("api_key_hash");