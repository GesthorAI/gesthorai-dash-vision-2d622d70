-- Run data migration for existing users without organizations
SELECT public.migrate_existing_data_to_orgs();