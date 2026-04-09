ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_node_id_unique" UNIQUE("role_id","node_id");
