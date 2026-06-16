const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv/config");

const DEMO_PASSWORD = "12345678";

const brands = ["LG", "Samsung", "Haier", "Hisense", "Midea", "TCL", "AUX", "Sharp", "Panasonic"];
const brandCodes = {
  LG: "LG",
  Samsung: "SAM",
  Haier: "HAI",
  Hisense: "HIS",
  Midea: "MID",
  TCL: "TCL",
  AUX: "AUX",
  Sharp: "SHA",
  Panasonic: "PAN",
};

const summary = {
  categories: { added: 0, skipped: 0 },
  inventory: { added: 0, skipped: 0 },
  users: { added: 0, skipped: 0 },
  devices: { added: 0, skipped: 0 },
  customers: { added: 0, skipped: 0 },
};

const rolePermissions = {
  technician: [
    "dashboard.view",
    "cases.view",
    "cases.column.new.view",
    "cases.column.waiting.view",
    "cases.column.diagnosis.view",
    "cases.diagnosis.edit",
    "cases.diagnosis.invoice.preview",
    "cases.column.approval_part_delivery.view",
    "cases.approval.invoice.preview",
    "cases.approval.part_delivery_receive",
    "cases.column.in_progress.view",
    "cases.in_progress.execution.preview",
    "cases.in_progress.invoice.preview",
    "cases.in_progress.mark_repaired",
    "cases.column.repaired.view",
    "cases.repaired.summary.view",
    "cases.repaired.invoice.preview",
    "cases.repaired.post_repair_quality.view",
    "cases.repaired.ready_notification.send",
    "cases.column.not_repairable.view",
    "maintenance_operations.view",
    "maintenance_operations.quality_saved_data.view",
    "maintenance_operations.final_invoice.view",
    "maintenance_operations.after_repair_image.view",
    "maintenance_operations.after_repair_video.view",
    "maintenance_operations.damaged_part_image.view",
  ],
  technician_manager: [
    "dashboard.view",
    "cases.view",
    "cases.create",
    "cases.column.new.view",
    "cases.column.waiting.view",
    "cases.column.diagnosis.view",
    "cases.diagnosis.edit",
    "cases.diagnosis.invoice.preview",
    "cases.column.approval_part_delivery.view",
    "cases.approval.invoice.preview",
    "cases.approval.approve",
    "cases.approval.part_delivery_receive",
    "cases.approval.prepare_execution",
    "cases.column.in_progress.view",
    "cases.in_progress.execution.preview",
    "cases.in_progress.invoice.preview",
    "cases.in_progress.mark_repaired",
    "cases.column.repaired.view",
    "cases.repaired.summary.view",
    "cases.repaired.invoice.preview",
    "cases.repaired.post_repair_quality.view",
    "cases.repaired.ready_notification.send",
    "cases.column.not_repairable.view",
    "maintenance_operations.view",
    "maintenance_operations.quality_saved_data.view",
    "maintenance_operations.final_invoice.view",
    "maintenance_operations.after_repair_image.view",
    "maintenance_operations.after_repair_video.view",
    "maintenance_operations.damaged_part_image.view",
    "reports.view",
    "reports.cases.view",
    "reports.technicians.view",
    "reports.operations_workflow.view",
    "accounting.view",
    "accounting.team.view",
  ],
  store_manager: [
    "dashboard.view",
    "cases.view",
    "inventory.view",
    "inventory.admin_actions",
    "inventory.item.create",
    "inventory.item.edit",
    "inventory.item.delete",
    "inventory.item.quantity.update",
    "sales.view",
    "sales.create",
    "sales.confirm",
    "reports.view",
    "reports.inventory.view",
    "reports.sales.view",
  ],
  receptionist: [
    "dashboard.view",
    "cases.view",
    "cases.create",
    "reception_points.view",
    "reception_points.incoming_cases.view",
    "reception_points.receive_cases",
    "maintenance_operations.view",
    "sales.view",
    "sales.create",
    "accounting.view",
    "accounting.customers.view",
    "accounting.team.view",
    "accounting.suppliers.view",
    "accounting.devices.view",
  ],
};

const permissionCatalog = new Map();
Object.values(rolePermissions).flat().forEach((key) => {
  const group = key.includes(".") ? key.split(".")[0] : "maintenance_operations";
  permissionCatalog.set(key, { key, label: key, group, parentKey: null });
});
permissionCatalog.set("delete_maintenance_operation", {
  key: "delete_maintenance_operation",
  label: "حذف عمليات الصيانة",
  group: "maintenance_operations",
  parentKey: "maintenance_operations.view",
});

const categories = [
  { name: "لوحة إلكترونية", description: "لوحات تحكم للأجهزة المنزلية" },
  { name: "محرك غسالة", description: "محركات غسالات بأحجام مختلفة" },
  { name: "مضخة غسالة", description: "مضخات صرف ومياه للغسالات" },
  { name: "قفل باب غسالة", description: "أقفال أبواب الغسالات" },
  { name: "مروحة", description: "مراوح ثلاجات ومكيفات" },
  { name: "ريموت كنترول", description: "وحدات تحكم للمكيفات" },
  { name: "قطع غيار عامة", description: "قطع إضافية مستخدمة في الصيانة" },
];

const priceFor = (index, base, step) => base + index * step;
const stockFor = (index) => [0, 2, 4, 7, 12, 18, 25][index % 7];

const buildInventoryItems = () => {
  const items = [];

  const addItem = (category, name, code, brand, model, index, baseCost, step, description) => {
    const cost = priceFor(index, baseCost, step);
    items.push({
      category,
      name,
      code,
      brand,
      model,
      quantity: stockFor(index),
      minimumStock: index % 5 === 0 ? 3 : 5,
      unitCost: cost,
      sellingPrice: Math.round(cost * 1.35),
      imageUrl: null,
      location: `رف ${String.fromCharCode(65 + (index % 6))}-${(index % 9) + 1}`,
      description,
    });
  };

  const washingSizes = ["8KG", "9KG", "10KG", "12KG", "21KG"];
  const fridgeSizes = ["400L", "500L", "520L", "800L"];
  const acSizes = ["12BTU", "18BTU", "24BTU", "30BTU"];

  brands.slice(0, 8).forEach((brand, index) => {
    const size = washingSizes[index % washingSizes.length];
    addItem("لوحة إلكترونية", `لوحة إلكترونية غسالة ${brand} ${size.replace("KG", " كيلو")}`, `PCB-WM-${brandCodes[brand]}-${size}-001`, brand, size, index, 180, 12, "لوحة تحكم لغسالات أوتوماتيك");
  });
  brands.slice(1, 8).forEach((brand, index) => {
    const size = fridgeSizes[index % fridgeSizes.length];
    addItem("لوحة إلكترونية", `لوحة إلكترونية ثلاجة ${brand} ${size.replace("L", " لتر")}`, `PCB-FR-${brandCodes[brand]}-${size}-001`, brand, size, index + 8, 210, 14, "لوحة تحكم للثلاجات");
  });
  brands.slice(0, 8).forEach((brand, index) => {
    const size = acSizes[index % acSizes.length];
    addItem("لوحة إلكترونية", `لوحة إلكترونية مكيف ${brand} ${size.replace("BTU", " BTU")}`, `PCB-AC-${brandCodes[brand]}-${size}-001`, brand, size, index + 15, 230, 16, "لوحة تحكم للمكيفات");
  });

  brands.slice(0, 9).forEach((brand, index) => {
    const size = washingSizes[index % washingSizes.length];
    addItem("محرك غسالة", `محرك غسالة ${brand} ${size.replace("KG", " كيلو")}`, `MOTOR-WM-${brandCodes[brand]}-${size}-001`, brand, size, index + 23, 260, 18, "محرك رئيسي لغسالة");
  });

  brands.slice(0, 7).forEach((brand, index) => {
    addItem("مضخة غسالة", `مضخة صرف غسالة ${brand}`, `PUMP-WM-${brandCodes[brand]}-DRAIN-001`, brand, "Drain", index + 32, 55, 5, "مضخة صرف للغسالات فقط");
    addItem("قفل باب غسالة", `قفل باب غسالة ${brand}`, `LOCK-WM-${brandCodes[brand]}-001`, brand, "Door lock", index + 39, 45, 4, "قفل باب للغسالات فقط");
  });

  brands.slice(0, 5).forEach((brand, index) => {
    const size = fridgeSizes[index % fridgeSizes.length];
    addItem("مروحة", `مروحة ثلاجة ${brand} ${size.replace("L", " لتر")}`, `FAN-FR-${brandCodes[brand]}-${size}-001`, brand, size, index + 46, 65, 6, "مروحة تبريد للثلاجات");
  });
  brands.slice(2, 9).forEach((brand, index) => {
    const size = acSizes[index % acSizes.length];
    addItem("مروحة", `مروحة مكيف ${brand} ${size.replace("BTU", " BTU")}`, `FAN-AC-${brandCodes[brand]}-${size}-001`, brand, size, index + 51, 75, 7, "مروحة للمكيفات");
  });

  brands.slice(0, 9).forEach((brand, index) => {
    addItem("ريموت كنترول", `ريموت مكيف ${brand}`, `REMOTE-AC-${brandCodes[brand]}-001`, brand, "AC Remote", index + 58, 25, 3, "ريموت كنترول للمكيفات فقط");
  });

  const extras = [
    ["LG", "حساس حرارة ثلاجة LG", "SENSOR-FR-LG-TEMP-001", "ثلاجة", 35],
    ["Samsung", "ثرموستات ثلاجة Samsung", "THERMO-FR-SAM-001", "ثلاجة", 42],
    ["Haier", "كمبروسر ثلاجة Haier 500 لتر", "COMP-FR-HAI-500L-001", "500L", 380],
    ["Hisense", "كمبروسر ثلاجة Hisense 520 لتر", "COMP-FR-HIS-520L-001", "520L", 395],
    ["Midea", "مكثف مكيف Midea 18 BTU", "CAP-AC-MID-18BTU-001", "18BTU", 48],
    ["AUX", "مكثف مكيف AUX 24 BTU", "CAP-AC-AUX-24BTU-001", "24BTU", 55],
    ["TCL", "حساس مكيف TCL", "SENSOR-AC-TCL-001", "مكيف", 32],
    ["Sharp", "كابل توصيل Sharp", "CABLE-SHA-001", "Universal", 18],
    ["Panasonic", "خرطوم صرف غسالة Panasonic", "HOSE-WM-PAN-DRAIN-001", "Universal", 20],
    ["LG", "سير غسالة LG 8 كيلو", "BELT-WM-LG-8KG-001", "8KG", 22],
    ["Samsung", "سير غسالة Samsung 12 كيلو", "BELT-WM-SAM-12KG-001", "12KG", 24],
    ["Midea", "صمام دخول ماء غسالة Midea", "VALVE-WM-MID-INLET-001", "Water inlet", 38],
    ["Haier", "صمام دخول ماء غسالة Haier", "VALVE-WM-HAI-INLET-001", "Water inlet", 39],
    ["Hisense", "حساس حرارة ثلاجة Hisense", "SENSOR-FR-HIS-TEMP-001", "ثلاجة", 34],
    ["TCL", "كابل توصيل TCL", "CABLE-TCL-001", "Universal", 17],
  ];

  extras.forEach(([brand, name, code, model, cost], index) => {
    addItem("قطع غيار عامة", name, code, brand, model, index + 67, Number(cost), 4, "قطعة غيار عامة للصيانة");
  });

  return items;
};

const buildDevices = () => {
  const devices = [];
  const washingSizes = ["8 كيلو", "9 كيلو", "10 كيلو", "12 كيلو", "21 كيلو"];
  const fridgeSizes = ["400 لتر", "500 لتر", "520 لتر", "800 لتر"];
  const acSizes = ["12 BTU", "18 BTU", "24 BTU", "30 BTU"];

  brands.forEach((brand, index) => {
    const size = washingSizes[index % washingSizes.length];
    devices.push({ applianceType: "غسالة", brand, modelName: `${brand} ${size}`, modelCode: `WM-${brandCodes[brand]}-${index + 1}`, notes: `غسالة ${brand} ${size}` });
  });
  brands.forEach((brand, index) => {
    const size = fridgeSizes[index % fridgeSizes.length];
    devices.push({ applianceType: "ثلاجة", brand, modelName: `${brand} ${size}`, modelCode: `FR-${brandCodes[brand]}-${index + 1}`, notes: `ثلاجة ${brand} ${size}` });
  });
  brands.forEach((brand, index) => {
    const size = acSizes[index % acSizes.length];
    devices.push({ applianceType: "مكيف", brand, modelName: `${brand} ${size}`, modelCode: `AC-${brandCodes[brand]}-${index + 1}`, notes: `مكيف ${brand} ${size}` });
  });
  brands.slice(0, 9).forEach((brand, index) => {
    const size = washingSizes[(index + 2) % washingSizes.length];
    devices.push({ applianceType: "غسالة", brand, modelName: `${brand} تحميل أمامي ${size}`, modelCode: `WMF-${brandCodes[brand]}-${index + 1}`, notes: `غسالة تحميل أمامي ${size}` });
  });
  brands.slice(0, 9).forEach((brand, index) => {
    const size = acSizes[(index + 1) % acSizes.length];
    devices.push({ applianceType: "مكيف", brand, modelName: `${brand} سبليت ${size}`, modelCode: `ACS-${brandCodes[brand]}-${index + 1}`, notes: `مكيف سبليت ${size}` });
  });

  return devices;
};

const customers = [
  ["سالم محمد", "0913001001", "طرابلس", "طرابلس - حي الأندلس"],
  ["عبد الله علي", "0923001002", "مصراتة", "مصراتة - شارع طرابلس"],
  ["فاطمة حسن", "0943001003", "بنغازي", "بنغازي - الحدائق"],
  ["مريم الطاهر", "0913001004", "الزاوية", "الزاوية - المركز"],
  ["ناصر فرج", "0923001005", "زليتن", "زليتن - السوق"],
  ["خالد منصور", "0943001006", "سبها", "سبها - الجديد"],
  ["عائشة سالم", "0913001007", "الخمس", "الخمس - وسط المدينة"],
  ["إبراهيم المختار", "0923001008", "البيضاء", "البيضاء - الجبل"],
  ["منى الشريف", "0943001009", "غريان", "غريان - طريق القواسم"],
  ["أحمد الهادي", "0913001010", "سرت", "سرت - الحي السكني"],
  ["يوسف عمران", "0923001011", "طرابلس", "طرابلس - تاجوراء"],
  ["رانيا ميلاد", "0943001012", "مصراتة", "مصراتة - الجزيرة"],
  ["محمود السنوسي", "0913001013", "بنغازي", "بنغازي - البركة"],
  ["ليلى الورفلي", "0923001014", "الزاوية", "الزاوية - الحرشة"],
  ["محمد البكوش", "0943001015", "زليتن", "زليتن - الجمعة"],
  ["نجلاء عون", "0913001016", "سبها", "سبها - المنشية"],
  ["طارق المبروك", "0923001017", "الخمس", "الخمس - الساحل"],
  ["هناء عبد السلام", "0943001018", "البيضاء", "البيضاء - المدينة"],
  ["علي الزروق", "0913001019", "غريان", "غريان - المركز"],
  ["سعاد القذافي", "0923001020", "سرت", "سرت - الزعفران"],
  ["فتحي الحداد", "0943001021", "طرابلس", "طرابلس - الهضبة"],
  ["أسماء الفيتوري", "0913001022", "مصراتة", "مصراتة - الدافنية"],
  ["عبد الرحمن ميلاد", "0923001023", "بنغازي", "بنغازي - الليثي"],
  ["خديجة التومي", "0943001024", "الزاوية", "الزاوية - بئر الغنم"],
  ["مصطفى سالم", "0913001025", "زليتن", "زليتن - ماجر"],
  ["ابتسام عيسى", "0923001026", "سبها", "سبها - القرضة"],
  ["جمال الرقيعي", "0943001027", "الخمس", "الخمس - سوق الخميس"],
  ["هدى منصور", "0913001028", "البيضاء", "البيضاء - الوسيطة"],
  ["سليمان المغربي", "0923001029", "غريان", "غريان - أبوزيان"],
  ["مبروكة الشريف", "0943001030", "سرت", "سرت - الشعبية"],
  ["عبد الحكيم اللافي", "0913001031", "طرابلس", "طرابلس - عين زارة"],
  ["إيمان الزنتاني", "0923001032", "مصراتة", "مصراتة - الكراريم"],
  ["حسن عبد النبي", "0943001033", "بنغازي", "بنغازي - سيدي يونس"],
  ["نور الهدى علي", "0913001034", "الزاوية", "الزاوية - المطرد"],
  ["فرج العرفي", "0923001035", "زليتن", "زليتن - كادوش"],
  ["صالحة عمران", "0943001036", "سبها", "سبها - المهدية"],
  ["رمضان الورفلي", "0913001037", "الخمس", "الخمس - كعام"],
  ["وفاء الشيباني", "0923001038", "البيضاء", "البيضاء - عمر المختار"],
  ["أنس الطرابلسي", "0943001039", "غريان", "غريان - تغسات"],
  ["نهى المصراتي", "0913001040", "سرت", "سرت - الرباط"],
].map(([name, phone, city, address]) => ({ name, phone, address, notes: `عميل تجريبي من ${city}` }));

const teamUsers = [
  ["محمد سالم", "technician1@maintenance.local", "0917001001", "technician", "غسالات"],
  ["علي فرج", "technician2@maintenance.local", "0927001002", "technician", "ثلاجات"],
  ["أحمد منصور", "technician3@maintenance.local", "0947001003", "technician", "مكيفات"],
  ["خالد الهادي", "technician4@maintenance.local", "0917001004", "technician", "إلكترونيات"],
  ["يوسف عمران", "technician5@maintenance.local", "0927001005", "technician", "كهرباء منزلية"],
  ["محمود الشريف", "technician6@maintenance.local", "0947001006", "technician", "غسالات"],
  ["عبد الرحمن ميلاد", "technician7@maintenance.local", "0917001007", "technician", "ثلاجات"],
  ["فتحي السنوسي", "technician8@maintenance.local", "0927001008", "technician", "مكيفات"],
  ["أنس الطرابلسي", "technician9@maintenance.local", "0947001009", "technician", "إلكترونيات"],
  ["صلاح الورفلي", "technician10@maintenance.local", "0917001010", "technician", "كهرباء منزلية"],
  ["عبد الله العبيدي", "techmanager@maintenance.local", "0927001011", "technician_manager", "إدارة الفنيين"],
  ["سارة بن سالم", "storemanager@maintenance.local", "0947001012", "store_manager", "إدارة المخزون"],
  ["محمود علي", "receptionist.demo@maintenance.local", "0917001013", "receptionist", "استقبال"],
].map(([name, email, phone, role, specialization]) => ({ name, email, phone, role, specialization }));

const queryOne = async (client, text, params = []) => {
  const result = await client.query(text, params);
  return result.rows[0];
};

const ensureCategory = async (client, category) => {
  const existing = await queryOne(client, "select id from inventory_categories where name = $1 limit 1", [category.name]);
  if (existing) {
    summary.categories.skipped += 1;
    return existing.id;
  }

  const created = await queryOne(
    client,
    "insert into inventory_categories (name, description) values ($1, $2) returning id",
    [category.name, category.description]
  );
  summary.categories.added += 1;
  return created.id;
};

const ensurePermissions = async (client) => {
  for (const permission of permissionCatalog.values()) {
    await client.query(
      `insert into permissions (key, label, group_name, parent_key, sort_order)
       values ($1, $2, $3, $4, 500)
       on conflict (key) do nothing`,
      [permission.key, permission.label, permission.group, permission.parentKey]
    );
  }
};

const assignRolePermissions = async (client, userId, role) => {
  const keys = rolePermissions[role] || [];
  if (!keys.length) return;

  const permissionRows = await client.query("select id from permissions where key = any($1::text[])", [keys]);
  for (const permission of permissionRows.rows) {
    await client.query(
      `insert into user_permissions (user_id, permission_id)
       values ($1, $2)
       on conflict (user_id, permission_id) do nothing`,
      [userId, permission.id]
    );
  }
};

const seedInventory = async (client) => {
  const categoryIds = new Map();
  for (const category of categories) {
    categoryIds.set(category.name, await ensureCategory(client, category));
  }

  for (const item of buildInventoryItems()) {
    const existing = await queryOne(client, "select id from inventory_items where code = $1 limit 1", [item.code]);
    if (existing) {
      summary.inventory.skipped += 1;
      continue;
    }

    const inserted = await client.query(
      `insert into inventory_items
        (name, code, category_id, brand, model, quantity, minimum_stock, unit_cost, selling_price, image_url, location, description)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, null, $10, $11)
       on conflict (code) do nothing`,
      [
        item.name,
        item.code,
        categoryIds.get(item.category),
        item.brand,
        item.model,
        item.quantity,
        item.minimumStock,
        item.unitCost,
        item.sellingPrice,
        item.location,
        item.description,
      ]
    );
    if (inserted.rowCount > 0) {
      summary.inventory.added += 1;
    } else {
      summary.inventory.skipped += 1;
    }
  }
};

const seedUsers = async (client) => {
  await ensurePermissions(client);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of teamUsers) {
    const existing = await queryOne(client, "select id, role from users where email = $1 limit 1", [user.email]);
    if (existing) {
      await assignRolePermissions(client, existing.id, existing.role);
      summary.users.skipped += 1;
      continue;
    }

    const created = await queryOne(
      client,
      `insert into users (name, email, password, phone, role)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [user.name, user.email, passwordHash, user.phone, user.role]
    );
    await assignRolePermissions(client, created.id, user.role);
    summary.users.added += 1;
  }
};

const seedDevices = async (client, createdBy) => {
  for (const device of buildDevices()) {
    const existing = await queryOne(
      client,
      "select id from devices where appliance_type = $1 and brand = $2 and model_name = $3 limit 1",
      [device.applianceType, device.brand, device.modelName]
    );
    if (existing) {
      summary.devices.skipped += 1;
      continue;
    }

    await client.query(
      `insert into devices (appliance_type, brand, model_name, model_code, notes, created_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [device.applianceType, device.brand, device.modelName, device.modelCode, device.notes, createdBy]
    );
    summary.devices.added += 1;
  }
};

const seedCustomers = async (client, createdBy) => {
  for (const customer of customers) {
    const existing = await queryOne(client, "select id from customers where phone = $1 limit 1", [customer.phone]);
    if (existing) {
      summary.customers.skipped += 1;
      continue;
    }

    await client.query(
      `insert into customers (name, phone, address, notes, created_by)
       values ($1, $2, $3, $4, $5)`,
      [customer.name, customer.phone, customer.address, customer.notes, createdBy]
    );
    summary.customers.added += 1;
  }
};

const printSummary = () => {
  console.log("Demo seed summary");
  console.table(summary);
  console.log("\nDemo team credentials");
  teamUsers.forEach((user) => {
    console.log(`${user.name} | ${user.role} | ${user.email} | password: ${DEMO_PASSWORD} | ${user.specialization}`);
  });
};

const main = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");
    const admin = await queryOne(client, "select id from users where role = 'admin' order by id asc limit 1");
    const createdBy = admin?.id || null;

    await seedInventory(client);
    await seedUsers(client);
    await seedDevices(client, createdBy);
    await seedCustomers(client, createdBy);

    await client.query("commit");
    printSummary();
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error("Demo seed failed");
  console.error(error);
  process.exit(1);
});
