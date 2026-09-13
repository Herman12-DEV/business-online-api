-- Preserve the product cost used when each sale is recorded.
ALTER TABLE "SaleItem" ADD COLUMN "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Existing sales did not store this snapshot. Backfill them with the current
-- product cost so historical reports remain usable after this migration.
UPDATE "SaleItem" AS si
SET "costPrice" = p."costPrice"
FROM "Product" AS p
WHERE si."productId" = p."id";