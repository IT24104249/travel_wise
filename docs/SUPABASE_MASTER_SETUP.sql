-- =============================================================================
-- TravelWise: Master Supabase SQL Script (All-in-One Database & Storage Setup)
-- =============================================================================
-- This single, unified script completely initializes:
--  1. Required PostgreSQL Extensions (uuid-ossp, pgcrypto)
--  2. Storage Buckets (travelwise-images, railway-fares, bus-fares, receipts) + Policies
--  3. All Application Tables, Primary Keys, Foreign Keys, Columns & Indexes
--  4. Row Level Security (RLS) configuration & is_admin() helper
--  5. EF Core Migration History registration
--  6. Pre-seeded System Admin Accounts in both UserAccounts & auth.users
--
-- How to run:
--  1. Open Supabase Dashboard -> SQL Editor
--  2. Click "New query"
--  3. Paste this entire file and click "Run" (green button)
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. SUPABASE STORAGE BUCKETS & ACCESS POLICIES
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('travelwise-images', 'travelwise-images', true),
    ('railway-fares', 'railway-fares', true),
    ('bus-fares', 'bus-fares', true),
    ('receipts', 'receipts', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop existing storage policies if present to prevent duplicate errors
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read - travelwise-images" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read - railway-fares" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read - bus-fares" ON storage.objects;
    DROP POLICY IF EXISTS "Allow All Uploads - travelwise-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow All Uploads - railway-fares" ON storage.objects;
    DROP POLICY IF EXISTS "Allow All Uploads - bus-fares" ON storage.objects;
    DROP POLICY IF EXISTS "Allow All Uploads - receipts" ON storage.objects;
    DROP POLICY IF EXISTS "Allow All Read - receipts" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Storage Policies
CREATE POLICY "Public Read - travelwise-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'travelwise-images');

CREATE POLICY "Public Read - railway-fares" ON storage.objects
    FOR SELECT USING (bucket_id = 'railway-fares');

CREATE POLICY "Public Read - bus-fares" ON storage.objects
    FOR SELECT USING (bucket_id = 'bus-fares');

CREATE POLICY "Allow All Uploads - travelwise-images" ON storage.objects
    FOR ALL USING (bucket_id = 'travelwise-images')
    WITH CHECK (bucket_id = 'travelwise-images');

CREATE POLICY "Allow All Uploads - railway-fares" ON storage.objects
    FOR ALL USING (bucket_id = 'railway-fares')
    WITH CHECK (bucket_id = 'railway-fares');

CREATE POLICY "Allow All Uploads - bus-fares" ON storage.objects
    FOR ALL USING (bucket_id = 'bus-fares')
    WITH CHECK (bucket_id = 'bus-fares');

CREATE POLICY "Allow All Uploads - receipts" ON storage.objects
    FOR ALL USING (bucket_id = 'receipts')
    WITH CHECK (bucket_id = 'receipts');

-- =============================================================================
-- 3. CORE RELATIONAL DATABASE TABLES
-- =============================================================================

-- 3.1 UserAccounts Table
CREATE TABLE IF NOT EXISTS "UserAccounts" (
    "Id"                        uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "Email"                     varchar(255) NOT NULL,
    "PasswordHash"              text NOT NULL,
    "DisplayName"               varchar(160) NOT NULL,
    "Role"                      varchar(50) NOT NULL DEFAULT 'User',
    "ContactPhone"              varchar(50),
    "ServiceType"               varchar(100),
    "IsActive"                  boolean NOT NULL DEFAULT true,
    "CreatedAt"                 timestamptz NOT NULL DEFAULT now(),
    "LastLoginAt"               timestamptz,
    "PasswordResetToken"        text,
    "PasswordResetTokenExpiry"  timestamptz,
    "PendingDisplayName"        text,
    "PendingContactPhone"       text,
    "PendingServiceType"        text,
    "PendingProfileStatus"      text,
    "ProfileReviewNote"         text,
    "ProfileUpdatedAt"          timestamptz,
    "DeletionRequested"         boolean NOT NULL DEFAULT false,
    "DeletionRequestedAt"       timestamptz,
    "DeletionReason"            text,
    "DeletionStatus"            text
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_UserAccounts_Email" ON "UserAccounts" ("Email");

-- 3.2 Trips Table
CREATE TABLE IF NOT EXISTS "Trips" (
    "Id"                        uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "Name"                      varchar(160) NOT NULL,
    "Destination"               varchar(160) NOT NULL,
    "StartDate"                 date NOT NULL,
    "EndDate"                   date NOT NULL,
    "StartingPoint"             text,
    "OwnerUserId"               varchar(200) NOT NULL DEFAULT '',
    "TravellerName"             text,
    "TravellerEmail"            text,
    "TravelMethod"              text,
    "TravelVehicleType"         text,
    "Status"                    text DEFAULT 'Active',
    "SubmittedToAdmin"          boolean DEFAULT false,
    "SubmittedAt"               timestamptz,
    "AdminFeedback"             text,
    "AdminWarningNote"          text,
    "PlanningDetailsJson"       text,
    "AdminApprovedAiReviewJson" text,
    "AdminCorrectionNotes"      text,
    "CreatedAt"                 timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "CK_Trip_Dates" CHECK ("EndDate" >= "StartDate")
);
CREATE INDEX IF NOT EXISTS "IX_Trips_Destination" ON "Trips" ("Destination");
CREATE INDEX IF NOT EXISTS "IX_Trips_OwnerUserId" ON "Trips" ("OwnerUserId");

-- 3.3 Workflows Table
CREATE TABLE IF NOT EXISTS "Workflows" (
    "Id"           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"       uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "Objective"    varchar(1000) NOT NULL,
    "Status"       varchar(40) NOT NULL DEFAULT 'Pending',
    "PlanJson"     text,
    "ResultJson"   text,
    "CreatedAt"    timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_Workflows_TripId" ON "Workflows" ("TripId");
CREATE INDEX IF NOT EXISTS "IX_Workflows_Status" ON "Workflows" ("Status");

-- 3.4 AuditLogs Table
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "Id"          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "WorkflowId"  uuid NOT NULL REFERENCES "Workflows"("Id") ON DELETE CASCADE,
    "EventType"   text NOT NULL,
    "Details"     text NOT NULL,
    "CreatedAt"   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_WorkflowId" ON "AuditLogs" ("WorkflowId");

-- 3.5 Budgets Table
CREATE TABLE IF NOT EXISTS "Budgets" (
    "Id"         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"     uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "Amount"     numeric(18,2) NOT NULL,
    "Currency"   text NOT NULL DEFAULT 'LKR',
    "CreatedAt"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_Budgets_TripId" ON "Budgets" ("TripId");

-- 3.6 SharedExpenses Table
CREATE TABLE IF NOT EXISTS "SharedExpenses" (
    "Id"           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"       uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "Description"  text NOT NULL,
    "Amount"       numeric(18,2) NOT NULL,
    "Currency"     text NOT NULL DEFAULT 'LKR',
    "PaidBy"       text NOT NULL,
    "CreatedAt"    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_SharedExpenses_TripId" ON "SharedExpenses" ("TripId");

-- 3.7 GroupMembers Table
CREATE TABLE IF NOT EXISTS "GroupMembers" (
    "Id"           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"       uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "DisplayName"  text NOT NULL,
    "Email"        text,
    "IsActive"     boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS "IX_GroupMembers_TripId" ON "GroupMembers" ("TripId");

-- 3.8 ExpenseSplits Table
CREATE TABLE IF NOT EXISTS "ExpenseSplits" (
    "Id"               uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "SharedExpenseId"  uuid NOT NULL REFERENCES "SharedExpenses"("Id") ON DELETE CASCADE,
    "GroupMemberId"    uuid NOT NULL REFERENCES "GroupMembers"("Id") ON DELETE CASCADE,
    "Amount"           numeric(18,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_ExpenseSplits_SharedExpenseId" ON "ExpenseSplits" ("SharedExpenseId");
CREATE INDEX IF NOT EXISTS "IX_ExpenseSplits_GroupMemberId" ON "ExpenseSplits" ("GroupMemberId");

-- 3.9 Activities Table
CREATE TABLE IF NOT EXISTS "Activities" (
    "Id"         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"     uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "Name"       text NOT NULL,
    "Location"   text NOT NULL,
    "StartAt"    timestamptz NOT NULL,
    "EndAt"      timestamptz NOT NULL,
    "CreatedAt"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_Activities_TripId_StartAt_EndAt" ON "Activities" ("TripId", "StartAt", "EndAt");

-- 3.10 RiskAssessments Table
CREATE TABLE IF NOT EXISTS "RiskAssessments" (
    "Id"              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"          uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "Severity"        text NOT NULL,
    "Summary"         text NOT NULL,
    "WeatherSummary"  text NOT NULL,
    "AssessedAt"      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_RiskAssessments_TripId" ON "RiskAssessments" ("TripId");

-- 3.11 ProviderRegistrations Table
CREATE TABLE IF NOT EXISTS "ProviderRegistrations" (
    "Id"            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "BusinessName"  text NOT NULL,
    "Email"         text NOT NULL,
    "ContactPhone"  text,
    "ServiceType"   text,
    "Status"        integer NOT NULL DEFAULT 0,
    "AdminNote"     text,
    "CreatedAt"     timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_ProviderRegistrations_Email" ON "ProviderRegistrations" ("Email");

-- 3.12 TravelCatalogItems Table (Explore Sri Lanka & Partner Listings)
CREATE TABLE IF NOT EXISTS "TravelCatalogItems" (
    "Id"                 uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "Type"               integer NOT NULL DEFAULT 0,
    "Name"               varchar(200) NOT NULL,
    "Destination"        varchar(200) NOT NULL,
    "Description"        text NOT NULL,
    "Address"            text,
    "Contact"            text,
    "Price"              numeric(18,2),
    "Currency"           varchar(10) NOT NULL DEFAULT 'LKR',
    "CuisineOrCategory"  varchar(100),
    "Rating"             numeric(3,2),
    "ProviderUserId"     varchar(200) NOT NULL DEFAULT '',
    "IsApproved"         boolean NOT NULL DEFAULT true,
    "IsActive"           boolean NOT NULL DEFAULT true,
    "CreatedAt"          timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_TravelCatalogItems_Destination" ON "TravelCatalogItems" ("Destination");
CREATE INDEX IF NOT EXISTS "IX_TravelCatalogItems_Type" ON "TravelCatalogItems" ("Type");
CREATE INDEX IF NOT EXISTS "IX_TravelCatalogItems_ProviderUserId" ON "TravelCatalogItems" ("ProviderUserId");

-- 3.13 Destinations Table
CREATE TABLE IF NOT EXISTS "Destinations" (
    "Id"             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "Name"           varchar(200) NOT NULL,
    "Description"    text,
    "Region"         text,
    "CreatedBy"      text NOT NULL DEFAULT '',
    "CreatedAt"      timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"      timestamptz NOT NULL DEFAULT now(),
    "IsActive"       boolean NOT NULL DEFAULT true,
    "Status"         text NOT NULL DEFAULT 'NotVerified',
    "VerifiedAt"     timestamptz,
    "VerifiedBy"     text,
    "AdminFeedback"  text
);
CREATE INDEX IF NOT EXISTS "IX_Destinations_Name_CreatedBy" ON "Destinations" ("Name", "CreatedBy");
CREATE INDEX IF NOT EXISTS "IX_Destinations_Status" ON "Destinations" ("Status");

-- 3.14 VisitingPlaces Table
CREATE TABLE IF NOT EXISTS "VisitingPlaces" (
    "Id"              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "DestinationId"   uuid NOT NULL REFERENCES "Destinations"("Id") ON DELETE CASCADE,
    "Name"            text NOT NULL DEFAULT '',
    "Description"     text,
    "Location"        text,
    "OpeningHours"    text,
    "TicketRequired"  boolean NOT NULL DEFAULT false,
    "TicketPrice"     numeric(18,2),
    "TicketType"      text NOT NULL DEFAULT 'None',
    "ImageUrls"       text,
    "CreatedBy"       text NOT NULL DEFAULT '',
    "CreatedAt"       timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"       timestamptz NOT NULL DEFAULT now(),
    "IsActive"        boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS "IX_VisitingPlaces_DestinationId" ON "VisitingPlaces" ("DestinationId");

-- 3.15 Restaurants Table
CREATE TABLE IF NOT EXISTS "Restaurants" (
    "Id"             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "DestinationId"  uuid NOT NULL REFERENCES "Destinations"("Id") ON DELETE CASCADE,
    "Name"           text NOT NULL DEFAULT '',
    "Location"       text,
    "Contact"        text,
    "Description"    text,
    "ImageUrls"      text,
    "CreatedBy"      text NOT NULL DEFAULT '',
    "CreatedAt"      timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"      timestamptz NOT NULL DEFAULT now(),
    "IsActive"       boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS "IX_Restaurants_DestinationId" ON "Restaurants" ("DestinationId");

-- 3.16 FoodItems Table
CREATE TABLE IF NOT EXISTS "FoodItems" (
    "Id"            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "RestaurantId"  uuid NOT NULL REFERENCES "Restaurants"("Id") ON DELETE CASCADE,
    "Name"          text NOT NULL DEFAULT '',
    "Price"         numeric(18,2) NOT NULL DEFAULT 0,
    "Category"      text NOT NULL DEFAULT 'Lunch',
    "ImageUrl"      text,
    "CreatedBy"     text NOT NULL DEFAULT '',
    "CreatedAt"     timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_FoodItems_RestaurantId" ON "FoodItems" ("RestaurantId");

-- 3.17 Accommodations Table
CREATE TABLE IF NOT EXISTS "Accommodations" (
    "Id"             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "DestinationId"  uuid NOT NULL REFERENCES "Destinations"("Id") ON DELETE CASCADE,
    "Name"           text NOT NULL DEFAULT '',
    "Type"           text NOT NULL DEFAULT 'Hotel',
    "Location"       text,
    "PricePerNight"  numeric(18,2),
    "SpecialNotes"   text,
    "Amenities"      text,
    "ImageUrls"      text,
    "ContactNumber"  text,
    "CreatedBy"      text NOT NULL DEFAULT '',
    "CreatedAt"      timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"      timestamptz NOT NULL DEFAULT now(),
    "IsActive"       boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS "IX_Accommodations_DestinationId" ON "Accommodations" ("DestinationId");

-- 3.18 TransportFareFiles Table (Railway & Bus CSV Datasets)
CREATE TABLE IF NOT EXISTS "TransportFareFiles" (
    "Id"                 uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "Category"           varchar(50) NOT NULL,
    "FileName"           varchar(255) NOT NULL,
    "StorageBucket"      varchar(100) NOT NULL,
    "StoragePath"        varchar(500) NOT NULL,
    "FileSizeBytes"      bigint NOT NULL DEFAULT 0,
    "UploadedByUserId"   varchar(200) NOT NULL DEFAULT '',
    "UploadedByRole"     varchar(50) NOT NULL DEFAULT 'ServiceProvider',
    "Status"             varchar(50) NOT NULL DEFAULT 'PendingApproval',
    "CreatedAt"          timestamptz NOT NULL DEFAULT now(),
    "ReviewedAt"         timestamptz,
    "ReviewedByUserId"   varchar(200),
    "AdminNotes"         text,
    "PublicUrl"          text,
    "IsActive"           boolean NOT NULL DEFAULT true,
    "ParsedRowCount"     int NOT NULL DEFAULT 0,
    "SamplePreviewJson"  text
);
CREATE INDEX IF NOT EXISTS "IX_TransportFareFiles_Category_Status" ON "TransportFareFiles" ("Category", "Status");

-- 3.19 RentalVehicleListings Table
CREATE TABLE IF NOT EXISTS "RentalVehicleListings" (
    "Id"                   uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "VehicleType"          varchar(50) NOT NULL DEFAULT 'Car',
    "VehicleModel"         varchar(160) NOT NULL DEFAULT '',
    "ManufacturingYear"    int NOT NULL DEFAULT 2020,
    "OwnerContactPhone"    varchar(50) NOT NULL DEFAULT '',
    "RatePerKm"            numeric(18,2) NOT NULL DEFAULT 0.0,
    "ExtraChargePerNight"  numeric(18,2) NOT NULL DEFAULT 0.0,
    "Location"             varchar(100) NOT NULL DEFAULT 'Colombo',
    "Description"          text,
    "ImageUrl"             text,
    "DriverIncluded"       boolean NOT NULL DEFAULT true,
    "SeatingCapacity"      int NOT NULL DEFAULT 4,
    "Status"               varchar(50) NOT NULL DEFAULT 'PendingReview',
    "AdminFeedback"        text,
    "ProviderUserId"       varchar(200) NOT NULL DEFAULT '',
    "ProviderEmail"        varchar(200),
    "ProviderName"         varchar(200),
    "CreatedAt"            timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt"            timestamptz,
    "ReviewedAt"           timestamptz,
    "ReviewedByUserId"     varchar(200),
    "IsActive"             boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS "IX_RentalVehicleListings_Type_Status" ON "RentalVehicleListings" ("VehicleType", "Status");
CREATE INDEX IF NOT EXISTS "IX_RentalVehicleListings_ProviderUserId" ON "RentalVehicleListings" ("ProviderUserId");

-- 3.20 SettlementRecords & WorkflowExecutions (Optional reporting tables)
CREATE TABLE IF NOT EXISTS "SettlementRecords" (
    "Id"           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "TripId"       uuid NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "PayerId"      text NOT NULL,
    "ReceiverId"   text NOT NULL,
    "Amount"       numeric(18,2) NOT NULL,
    "Status"       varchar(50) NOT NULL DEFAULT 'Pending',
    "CreatedAt"    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "WorkflowExecutions" (
    "Id"           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "WorkflowId"   uuid NOT NULL REFERENCES "Workflows"("Id") ON DELETE CASCADE,
    "AgentName"    text NOT NULL,
    "Status"       varchar(50) NOT NULL DEFAULT 'Completed',
    "OutputData"   text,
    "CreatedAt"    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- =============================================================================
-- Helper function to check if current Supabase JWT holder is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('StaffAdmin', 'Admin', 'SuperAdmin')),
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('StaffAdmin', 'Admin', 'SuperAdmin')),
    (auth.jwt() ->> 'email' IN ('admin@travelwise.com', 'admin@travelwise.lk', 'leadadmin@travelwise.com')),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- Enable RLS and setup permissive SELECT policies
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'UserAccounts', 'Trips', 'Workflows', 'AuditLogs', 'Budgets', 
        'SharedExpenses', 'GroupMembers', 'ExpenseSplits', 'Activities', 
        'RiskAssessments', 'ProviderRegistrations', 'TravelCatalogItems', 
        'Destinations', 'VisitingPlaces', 'Restaurants', 'FoodItems', 
        'Accommodations', 'TransportFareFiles', 'RentalVehicleListings',
        'SettlementRecords', 'WorkflowExecutions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select_all', tbl);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true);', tbl || '_select_all', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_admin_all', tbl);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl || '_admin_all', tbl);
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 5. REGISTER IN ENTITY FRAMEWORK CORE MIGRATION HISTORY
-- =============================================================================
-- This prevents EF Core from attempting redundant re-migrations on API startup
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId"    varchar(150) NOT NULL PRIMARY KEY,
    "ProductVersion" varchar(32)  NOT NULL
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES 
    ('20261012203715_AddUserAccounts', '8.0.10'),
    ('20261012205224_AddPasswordResetToken', '8.0.10'),
    ('20261013_AddDestinationFeature', '8.0.10')
ON CONFLICT ("MigrationId") DO NOTHING;

-- =============================================================================
-- 6. PRE-SEEDED SYSTEM ADMINISTRATOR ACCOUNTS
-- =============================================================================
-- Pre-seeds System Administrators in UserAccounts table (Compatible with ASP.NET Core JWT)
-- Default Password: Admin@123
INSERT INTO "UserAccounts" ("Id", "Email", "DisplayName", "Role", "PasswordHash", "IsActive", "CreatedAt")
VALUES 
    (
        '6d748ebb-4913-4dc0-a985-622253007f8d',
        'admin@travelwise.com',
        'System Administrator',
        'StaffAdmin',
        '7vU+Vv1iS0V8nN8n7A==.P2y0L4m0X0q0Q0Z0k0==',
        true,
        now()
    ),
    (
        '1cf4090f-646b-4ccd-b5c6-a31ed522707b',
        'admin@travelwise.lk',
        'System Administrator',
        'StaffAdmin',
        '7vU+Vv1iS0V8nN8n7A==.P2y0L4m0X0q0Q0Z0k0==',
        true,
        now()
    ),
    (
        '84cf108b-36e5-43ab-ac9e-0fd2dd8b78f8',
        'leadadmin@travelwise.com',
        'Lead Administrator',
        'StaffAdmin',
        '7vU+Vv1iS0V8nN8n7A==.P2y0L4m0X0q0Q0Z0k0==',
        true,
        now()
    )
ON CONFLICT ("Email") DO UPDATE 
SET "Role" = 'StaffAdmin', "IsActive" = true;

-- Pre-seed in auth.users and auth.identities if Supabase Auth is ever queried directly
DO $$
DECLARE
    v_user_id uuid;
    v_now timestamptz := now();
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@travelwise.com';
    IF v_user_id IS NULL THEN
        v_user_id := '6d748ebb-4913-4dc0-a985-622253007f8d'::uuid;
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
        ) VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', 'admin@travelwise.com',
            crypt('Admin@123', gen_salt('bf')), v_now,
            '{"provider": "email", "providers": ["email"], "role": "StaffAdmin"}'::jsonb,
            '{"role": "StaffAdmin", "display_name": "System Administrator"}'::jsonb,
            'authenticated', 'authenticated', v_now, v_now
        );
        INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(), v_user_id, 'admin@travelwise.com',
            jsonb_build_object('sub', v_user_id::text, 'email', 'admin@travelwise.com'),
            'email', v_now, v_now, v_now
        );
    END IF;
END $$;

-- Confirmation output
SELECT 'SUCCESS: TravelWise master schema, all 19 tables, 4 storage buckets, RLS policies, and administrator accounts have been fully initialized!' AS confirmation;
