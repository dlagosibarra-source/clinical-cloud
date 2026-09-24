ALTER TABLE "locations" ALTER COLUMN "timezone" SET DEFAULT 'America/Mexico_City';--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_variable_price" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "requires_assessment" boolean DEFAULT false NOT NULL;