-- Test script to verify delivery tables are working correctly
-- Run this after the main migration to test functionality

-- Test 1: Insert a test delivery
INSERT INTO "gigDeliveries" (
    "id",
    "gigId", 
    "applicationId",
    "submittedById",
    "submittedByType",
    "title",
    "description",
    "files",
    "version",
    "expiresAt"
) VALUES (
    'test_delivery_1',
    (SELECT "id" FROM "gigs" LIMIT 1),  -- Use first available gig
    (SELECT "id" FROM "applications" LIMIT 1),  -- Use first available application
    'test_user_123',
    'user',
    'Test Delivery',
    'This is a test delivery submission',
    ARRAY['https://example.com/file1.jpg', 'https://example.com/file2.mp4'],
    1,
    CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

-- Test 2: Insert a test cleanup record
INSERT INTO "gigDeliveryCleanups" (
    "id",
    "deliveryId",
    "fileUrls",
    "scheduledAt"
) VALUES (
    'test_cleanup_1',
    'test_delivery_1',
    ARRAY['https://example.com/file1.jpg', 'https://example.com/file2.mp4'],
    CURRENT_TIMESTAMP + INTERVAL '23 hours'
);

-- Test 3: Verify data was inserted correctly
SELECT 
    d.*,
    g."title" as gig_title,
    a."applicantId" as applicant_id
FROM "gigDeliveries" d
JOIN "gigs" g ON d."gigId" = g."id"
JOIN "applications" a ON d."applicationId" = a."id"
WHERE d."id" = 'test_delivery_1';

-- Test 4: Verify cleanup record
SELECT * FROM "gigDeliveryCleanups" WHERE "deliveryId" = 'test_delivery_1';

-- Test 5: Test status updates
UPDATE "gigDeliveries" 
SET "status" = 'APPROVED', "reviewedAt" = CURRENT_TIMESTAMP, "feedback" = 'Looks great!'
WHERE "id" = 'test_delivery_1';

-- Test 6: Test cleanup status update (should trigger updatedAt)
UPDATE "gigDeliveryCleanups" 
SET "status" = 'COMPLETED', "processedAt" = CURRENT_TIMESTAMP
WHERE "deliveryId" = 'test_delivery_1';

-- Test 7: Verify updates worked and updatedAt was triggered
SELECT 
    "status", 
    "reviewedAt", 
    "feedback",
    ("updatedAt" > "createdAt") as updated_at_triggered
FROM "gigDeliveries" 
WHERE "id" = 'test_delivery_1';

SELECT 
    "status", 
    "processedAt",
    ("updatedAt" > "createdAt") as updated_at_triggered
FROM "gigDeliveryCleanups" 
WHERE "deliveryId" = 'test_delivery_1';

-- Cleanup test data
DELETE FROM "gigDeliveryCleanups" WHERE "deliveryId" = 'test_delivery_1';
DELETE FROM "gigDeliveries" WHERE "id" = 'test_delivery_1';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_deliveries FROM "gigDeliveries" WHERE "id" = 'test_delivery_1';
SELECT COUNT(*) as remaining_test_cleanups FROM "gigDeliveryCleanups" WHERE "deliveryId" = 'test_delivery_1';

COMMIT;