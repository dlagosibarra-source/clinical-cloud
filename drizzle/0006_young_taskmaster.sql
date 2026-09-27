CREATE TABLE "whatsapp_conversations" (
	"conversation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid,
	"phone" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"last_message_at" timestamp with time zone,
	"last_inbound_at" timestamp with time zone,
	"last_outbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_whatsapp_conversations_org_conv" UNIQUE("organization_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_integrations" (
	"integration_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar(50) DEFAULT 'META_WHATSAPP' NOT NULL,
	"phone_number" varchar(30),
	"phone_number_id" varchar(100),
	"business_account_id" varchar(100),
	"display_name" varchar(100),
	"secret_reference" varchar(255),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"webhook_verified" boolean DEFAULT false NOT NULL,
	"last_webhook_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_whatsapp_integrations_org_phone_id" UNIQUE("organization_id","phone_number_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"message_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"patient_id" uuid,
	"provider_message_id" varchar(150),
	"direction" varchar(10) NOT NULL,
	"type" varchar(20) DEFAULT 'TEXT' NOT NULL,
	"body" text,
	"media_reference" text,
	"status" varchar(20) DEFAULT 'SENT' NOT NULL,
	"provider_timestamp" timestamp with time zone,
	"error_code" varchar(50),
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider_template_name" varchar(100) NOT NULL,
	"language_code" varchar(10) DEFAULT 'es_MX' NOT NULL,
	"category" varchar(30) DEFAULT 'UTILITY' NOT NULL,
	"body" text NOT NULL,
	"variables_schema" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"provider_template_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_whatsapp_templates_org_name_lang" UNIQUE("organization_id","name","language_code")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "fk_whatsapp_conversations_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "fk_whatsapp_messages_org_conversation" FOREIGN KEY ("organization_id","conversation_id") REFERENCES "public"."whatsapp_conversations"("organization_id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "fk_whatsapp_messages_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_org_id" ON "whatsapp_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_org_phone" ON "whatsapp_conversations" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_org_patient" ON "whatsapp_conversations" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_org_status" ON "whatsapp_conversations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_last_msg" ON "whatsapp_conversations" USING btree ("organization_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_integrations_org_id" ON "whatsapp_integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_integrations_org_status" ON "whatsapp_integrations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_org_id" ON "whatsapp_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_org_conversation" ON "whatsapp_messages" USING btree ("organization_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_org_provider_msg" ON "whatsapp_messages" USING btree ("organization_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_org_status" ON "whatsapp_messages" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_org_created" ON "whatsapp_messages" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_templates_org_id" ON "whatsapp_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_templates_org_status" ON "whatsapp_templates" USING btree ("organization_id","status");