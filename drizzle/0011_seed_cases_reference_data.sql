INSERT INTO "users" ("name", "email", "password", "role")
VALUES
  ('محمود الترهوني', 'mahmoud.technician@example.com', '$2b$10$3zHHVDrLMJ9XgcZrveSrwORzqdEMe6ryz3LYjWQnDeF59fMgCmnv6', 'technician'),
  ('سالم الورفلي', 'salem.technician@example.com', '$2b$10$3zHHVDrLMJ9XgcZrveSrwORzqdEMe6ryz3LYjWQnDeF59fMgCmnv6', 'technician'),
  ('عبدالله المصراتي', 'abdullah.technician@example.com', '$2b$10$3zHHVDrLMJ9XgcZrveSrwORzqdEMe6ryz3LYjWQnDeF59fMgCmnv6', 'technician'),
  ('يوسف الزليتني', 'yousef.technician@example.com', '$2b$10$3zHHVDrLMJ9XgcZrveSrwORzqdEMe6ryz3LYjWQnDeF59fMgCmnv6', 'technician'),
  ('خالد بنغازي', 'khaled.technician@example.com', '$2b$10$3zHHVDrLMJ9XgcZrveSrwORzqdEMe6ryz3LYjWQnDeF59fMgCmnv6', 'technician_manager')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "customers" ("name", "phone", "address", "notes")
SELECT 'أحمد بن صالح', '0911001001', 'طرابلس', 'عميل تجريبي من طرابلس'
WHERE NOT EXISTS (SELECT 1 FROM "customers" WHERE "phone" = '0911001001');

INSERT INTO "customers" ("name", "phone", "address", "notes")
SELECT 'فاطمة المصراتية', '0922002002', 'مصراتة', 'عميلة تجريبية من مصراتة'
WHERE NOT EXISTS (SELECT 1 FROM "customers" WHERE "phone" = '0922002002');

INSERT INTO "customers" ("name", "phone", "address", "notes")
SELECT 'محمد الورفلي', '0933003003', 'بنغازي', 'عميل تجريبي من بنغازي'
WHERE NOT EXISTS (SELECT 1 FROM "customers" WHERE "phone" = '0933003003');

INSERT INTO "customers" ("name", "phone", "address", "notes")
SELECT 'سعاد الزليتنية', '0944004004', 'زليتن', 'عميلة تجريبية من زليتن'
WHERE NOT EXISTS (SELECT 1 FROM "customers" WHERE "phone" = '0944004004');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'غسالة ملابس', 'LG', 'غسالة أمامية 8 كجم', 'WM-8KG', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'WM-8KG');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'ثلاجة', 'Samsung', 'ثلاجة بابين', 'RF-520', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'RF-520');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'مكيف هواء', 'Gree', 'مكيف سبليت 18', 'AC-18', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'AC-18');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'ميكروويف', 'Panasonic', 'ميكروويف رقمي 32 لتر', 'MW-32', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'MW-32');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'غسالة صحون', 'Bosch', 'غسالة صحون 12 فرد', 'DW-12', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'DW-12');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'فرن كهربائي', 'Ariston', 'فرن كهربائي مدمج', 'OV-60', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'OV-60');

INSERT INTO "devices" ("appliance_type", "brand", "model_name", "model_code", "notes")
SELECT 'مكنسة كهربائية', 'Philips', 'مكنسة كهربائية 2000 واط', 'VC-2000', 'جهاز منزلي تجريبي'
WHERE NOT EXISTS (SELECT 1 FROM "devices" WHERE "model_code" = 'VC-2000');
