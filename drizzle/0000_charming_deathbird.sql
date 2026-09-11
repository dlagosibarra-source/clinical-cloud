CREATE TABLE "appointments" (
	"appointment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"dentist_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"resource_id" uuid,
	"service_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'SCHEDULED' NOT NULL,
	"notes" text,
	"created_by_user_id" uuid NOT NULL,
	"service_name_snapshot" varchar(255) NOT NULL,
	"service_duration_snapshot" integer NOT NULL,
	"service_value_snapshot" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_appointments_end_after_start" CHECK ("appointments"."end_at" > "appointments"."start_at")
);
--> statement-breakpoint
CREATE TABLE "dentists" (
	"dentist_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"professional_name" varchar(200),
	"license_number" varchar(50),
	"specialty" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_dentists_org_dentist" UNIQUE("organization_id","dentist_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"location_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"phone" varchar(50),
	"email" varchar(255),
	"address" varchar(500),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country_code" varchar(10),
	"timezone" varchar(100),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_locations_org_code" UNIQUE("organization_id","code"),
	CONSTRAINT "uq_locations_org_location" UNIQUE("organization_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"organization_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(255),
	"slug" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"country_code" varchar(10),
	"timezone" varchar(100) DEFAULT 'America/Mexico_City' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"status" varchar(20) DEFAULT 'TRIAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"patient_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"date_of_birth" date,
	"gender" varchar(20),
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"whatsapp_opt_in_at" timestamp with time zone,
	"whatsapp_opt_out_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_patients_org_patient" UNIQUE("organization_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"resource_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"resource_type" varchar(20) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_resources_org_code" UNIQUE("organization_id","code"),
	CONSTRAINT "uq_resources_org_resource" UNIQUE("organization_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"service_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_services_org_name" UNIQUE("organization_id","name"),
	CONSTRAINT "uq_services_org_service" UNIQUE("organization_id","service_id"),
	CONSTRAINT "ck_services_duration_positive" CHECK ("services"."duration_minutes" > 0),
	CONSTRAINT "ck_services_price_non_negative" CHECK ("services"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'INVITED' NOT NULL,
	"phone" varchar(50),
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_users_org_email" UNIQUE("organization_id","email"),
	CONSTRAINT "uq_users_org_user" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_org_patient" FOREIGN KEY ("organization_id","patient_id") REFERENCES "public"."patients"("organization_id","patient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_org_dentist" FOREIGN KEY ("organization_id","dentist_id") REFERENCES "public"."dentists"("organization_id","dentist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_org_location" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_org_resource" FOREIGN KEY ("organization_id","resource_id") REFERENCES "public"."resources"("organization_id","resource_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_org_service" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_org_created_by" FOREIGN KEY ("organization_id","created_by_user_id") REFERENCES "public"."users"("organization_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentists" ADD CONSTRAINT "dentists_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentists" ADD CONSTRAINT "fk_dentists_org_user" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."users"("organization_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "fk_resources_org_location" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_org_id" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_dentist_start" ON "appointments" USING btree ("organization_id","dentist_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_patient" ON "appointments" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_start" ON "appointments" USING btree ("organization_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_dentists_org_id" ON "dentists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_locations_org_id" ON "locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_id" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_phone" ON "patients" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX "idx_patients_org_name" ON "patients" USING btree ("organization_id","last_name","first_name");--> statement-breakpoint
CREATE INDEX "idx_resources_org_id" ON "resources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_services_org_id" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_users_org_id" ON "users" USING btree ("organization_id");