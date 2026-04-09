DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'role_permissions_role_id_node_id_unique'
  ) THEN
    ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_node_id_unique"
    UNIQUE("role_id","node_id");
  END IF;
END $$;
