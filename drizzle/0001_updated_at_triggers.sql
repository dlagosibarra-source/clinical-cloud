CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "organizations_set_updated_at" ON "organizations";
--> statement-breakpoint
CREATE TRIGGER "organizations_set_updated_at"
  BEFORE UPDATE ON "organizations"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "users_set_updated_at" ON "users";
--> statement-breakpoint
CREATE TRIGGER "users_set_updated_at"
  BEFORE UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "dentists_set_updated_at" ON "dentists";
--> statement-breakpoint
CREATE TRIGGER "dentists_set_updated_at"
  BEFORE UPDATE ON "dentists"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "locations_set_updated_at" ON "locations";
--> statement-breakpoint
CREATE TRIGGER "locations_set_updated_at"
  BEFORE UPDATE ON "locations"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "resources_set_updated_at" ON "resources";
--> statement-breakpoint
CREATE TRIGGER "resources_set_updated_at"
  BEFORE UPDATE ON "resources"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "services_set_updated_at" ON "services";
--> statement-breakpoint
CREATE TRIGGER "services_set_updated_at"
  BEFORE UPDATE ON "services"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "patients_set_updated_at" ON "patients";
--> statement-breakpoint
CREATE TRIGGER "patients_set_updated_at"
  BEFORE UPDATE ON "patients"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "appointments_set_updated_at" ON "appointments";
--> statement-breakpoint
CREATE TRIGGER "appointments_set_updated_at"
  BEFORE UPDATE ON "appointments"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
