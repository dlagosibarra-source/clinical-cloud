CREATE TABLE "recovery_offers" (
	"offer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"waitlist_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"waitlist_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"dentist_id" uuid,
	"location_id" uuid,
	"preferred_date_start" date NOT NULL,
	"preferred_date_end" date NOT NULL,
	"preferred_time_start" varchar(5) DEFAULT '08:00' NOT NULL,
	"preferred_time_end" varchar(5) DEFAULT '20:00' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'WAITING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_waitlist_org_waitlist" UNIQUE("organization_id","waitlist_id")
);
--> statement-breakpoint
ALTER TABLE "recovery_offers" ADD CONSTRAINT "recovery_offers_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_offers" ADD CONSTRAINT "fk_recovery_offers_org_waitlist" FOREIGN KEY ("organization_id","waitlist_id") REFERENCES "public"."waitlist"("organization_id","waitlist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_offers" ADD CONSTRAINT "fk_recovery_offers_org_appointment" FOREIGN KEY ("organization_id","appointment_id") REFERENCES "public"."appointments"("organization_id","appointment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_offers" ADD CONSTRAINT "fk_recovery_offers_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "fk_waitlist_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "fk_waitlist_org_service" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "fk_waitlist_org_dentist" FOREIGN KEY ("organization_id","dentist_id") REFERENCES "public"."dentists"("organization_id","dentist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "fk_waitlist_org_location" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recovery_offers_org_id" ON "recovery_offers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_recovery_offers_org_status" ON "recovery_offers" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_recovery_offers_org_waitlist" ON "recovery_offers" USING btree ("organization_id","waitlist_id");--> statement-breakpoint
CREATE INDEX "idx_recovery_offers_org_appointment" ON "recovery_offers" USING btree ("organization_id","appointment_id");--> statement-breakpoint
CREATE INDEX "idx_recovery_offers_expires_at" ON "recovery_offers" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_waitlist_org_id" ON "waitlist" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_waitlist_org_status" ON "waitlist" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_waitlist_org_patient" ON "waitlist" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_waitlist_org_service" ON "waitlist" USING btree ("organization_id","service_id");