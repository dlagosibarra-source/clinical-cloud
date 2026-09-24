CREATE TABLE "availability_blocks" (
	"block_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"dentist_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"reason" varchar(255),
	"is_blocked" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dentist_availability" (
	"availability_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"dentist_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_dentist_id_dentists_dentist_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("dentist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentist_availability" ADD CONSTRAINT "dentist_availability_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentist_availability" ADD CONSTRAINT "dentist_availability_dentist_id_dentists_dentist_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("dentist_id") ON DELETE no action ON UPDATE no action;