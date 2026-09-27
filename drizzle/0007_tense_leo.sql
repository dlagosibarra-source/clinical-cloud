CREATE TABLE "ai_conversation_context" (
	"context_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"patient_id" uuid,
	"summary" text,
	"current_intent" varchar(100),
	"intent_status" varchar(50) DEFAULT 'NONE' NOT NULL,
	"context_data" jsonb DEFAULT '{}'::jsonb,
	"last_processed_message_id" uuid,
	"last_ai_request_at" timestamp with time zone,
	"context_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ai_conversation_context_org_conv" UNIQUE("organization_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "ai_interactions" (
	"interaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"conversation_id" uuid,
	"patient_id" uuid,
	"trigger_message_id" uuid,
	"provider_message_id" varchar(150),
	"provider" varchar(50) DEFAULT 'GROQ' NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_id" varchar(100),
	"tool_name" varchar(100),
	"tool_calls" jsonb DEFAULT '[]'::jsonb,
	"tool_results" jsonb DEFAULT '[]'::jsonb,
	"request_payload" jsonb DEFAULT '{}'::jsonb,
	"response_payload" jsonb DEFAULT '{}'::jsonb,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'SUCCESS' NOT NULL,
	"error_message" text,
	"result_type" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ai_interactions_org_interaction" UNIQUE("organization_id","interaction_id")
);
--> statement-breakpoint
ALTER TABLE "ai_conversation_context" ADD CONSTRAINT "ai_conversation_context_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation_context" ADD CONSTRAINT "fk_ai_conversation_context_org_conv" FOREIGN KEY ("organization_id","conversation_id") REFERENCES "public"."whatsapp_conversations"("organization_id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation_context" ADD CONSTRAINT "fk_ai_conversation_context_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "fk_ai_interactions_org_conv" FOREIGN KEY ("organization_id","conversation_id") REFERENCES "public"."whatsapp_conversations"("organization_id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "fk_ai_interactions_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conv_context_org_id" ON "ai_conversation_context" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conv_context_org_conv" ON "ai_conversation_context" USING btree ("organization_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conv_context_org_patient" ON "ai_conversation_context" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conv_context_org_intent" ON "ai_conversation_context" USING btree ("organization_id","intent_status");--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_org_id" ON "ai_interactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_org_conv" ON "ai_interactions" USING btree ("organization_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_org_patient" ON "ai_interactions" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_org_status" ON "ai_interactions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_org_created" ON "ai_interactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_provider" ON "ai_interactions" USING btree ("organization_id","provider");