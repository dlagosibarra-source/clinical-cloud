CREATE TABLE "appointment_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"actor_type" varchar(50) DEFAULT 'USER' NOT NULL,
	"actor_user_id" uuid,
	"source" varchar(50) DEFAULT 'WEB' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("appointment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "uq_appointments_org_appointment" UNIQUE("organization_id","appointment_id");--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "fk_appointment_events_org_appointment" FOREIGN KEY ("organization_id","appointment_id") REFERENCES "public"."appointments"("organization_id","appointment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointment_events_org_id" ON "appointment_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_events_org_appointment" ON "appointment_events" USING btree ("organization_id","appointment_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_events_org_type" ON "appointment_events" USING btree ("organization_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_appointment_events_created_at" ON "appointment_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_patients_org_email" ON "patients" USING btree ("organization_id","email");