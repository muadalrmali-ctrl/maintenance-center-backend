import { db } from "../../db";
import {
  caseParts,
  caseServices,
  cases,
  customers,
  devices,
  inventoryItems,
  inventoryMovements,
  invoiceItems,
  invoices,
  users,
} from "../../db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type CreateInvoiceInput = {
  discount?: number;
  tax?: number;
  notes?: string;
};

type CreateDirectInvoiceInput = {
  customerId?: number;
  directCustomerName?: string;
  directCustomerPhone?: string;
  discount?: number;
  tax?: number;
  notes?: string;
  items: {
    name?: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    referenceId: number;
  }[];
};

type Invoice = {
  id: number;
  caseId: number | null;
  customerId: number | null;
  invoiceType: string;
  directCustomerName: string | null;
  directCustomerPhone: string | null;
  invoiceNumber: string;
  saleCode: string | null;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string | null;
  issuedAt: Date | null;
  confirmedAt: Date | null;
  confirmedBy: number | null;
  createdBy: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  caseCode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
  createdByName?: string | null;
  confirmedByName?: string | null;
  saleDate?: Date | null;
};

type InvoiceItem = {
  id: number;
  invoiceId: number;
  itemType: string;
  referenceId: number | null;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const SALE_STATUS = {
  DRAFT: "draft",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

const getLastNumberFromCode = (value: string | null | undefined, prefix: string) => {
  if (!value?.startsWith(prefix)) return null;
  const numericPart = value.slice(prefix.length);
  const parsed = Number(numericPart);
  return Number.isFinite(parsed) ? parsed : null;
};

const generateSaleCode = async (tx: any, prefix: "S" | "MS") => {
  const existingCodes = await tx
    .select({ saleCode: invoices.saleCode })
    .from(invoices)
    .where(sql`${invoices.saleCode} like ${`${prefix}%`}`);

  const lastNumber = existingCodes.reduce((max: number, row: { saleCode: string | null }) => {
    const codeNumber = getLastNumberFromCode(row.saleCode, prefix);
    return codeNumber != null ? Math.max(max, codeNumber) : max;
  }, 99);

  return `${prefix}${Math.max(lastNumber + 1, 100)}`;
};

const buildInvoiceListSelect = () => ({
  id: invoices.id,
  caseId: invoices.caseId,
  customerId: invoices.customerId,
  invoiceType: invoices.invoiceType,
  directCustomerName: invoices.directCustomerName,
  directCustomerPhone: invoices.directCustomerPhone,
  invoiceNumber: invoices.invoiceNumber,
  saleCode: invoices.saleCode,
  status: invoices.status,
  subtotal: invoices.subtotal,
  discount: invoices.discount,
  tax: invoices.tax,
  total: invoices.total,
  notes: invoices.notes,
  issuedAt: invoices.issuedAt,
  confirmedAt: invoices.confirmedAt,
  confirmedBy: invoices.confirmedBy,
  createdBy: invoices.createdBy,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
  caseCode: cases.caseCode,
  customerName: customers.name,
  customerPhone: customers.phone,
  deviceApplianceType: devices.applianceType,
  deviceBrand: devices.brand,
  deviceModelName: devices.modelName,
  createdByName: users.name,
  confirmedByName: sql<string | null>`confirm_users.name`,
  saleDate: sql<Date | null>`coalesce(${invoices.confirmedAt}, ${invoices.issuedAt}, ${invoices.createdAt})`,
});

const getInvoiceRows = async (executor: any, whereClause?: any) => {
  const baseQuery = executor
    .select(buildInvoiceListSelect())
    .from(invoices)
    .leftJoin(cases, eq(invoices.caseId, cases.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(devices, eq(cases.deviceId, devices.id))
    .leftJoin(users, eq(invoices.createdBy, users.id))
    .leftJoin(sql`users as confirm_users`, sql`confirm_users.id = ${invoices.confirmedBy}`);

  const scopedQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;

  return scopedQuery.orderBy(
    desc(sql`coalesce(${invoices.confirmedAt}, ${invoices.issuedAt}, ${invoices.createdAt})`),
    desc(invoices.createdAt)
  );
};

const buildMaintenanceInvoiceItems = async (tx: any, caseId: number) => {
  const parts = await tx
    .select({
      id: caseParts.id,
      quantity: caseParts.quantity,
      unitPrice: caseParts.unitPrice,
      totalPrice: caseParts.totalPrice,
      notes: caseParts.notes,
      inventoryName: inventoryItems.name,
      inventoryCode: inventoryItems.code,
    })
    .from(caseParts)
    .leftJoin(inventoryItems, eq(caseParts.inventoryItemId, inventoryItems.id))
    .where(eq(caseParts.caseId, caseId));

  const services = await tx
    .select({
      id: caseServices.id,
      serviceName: caseServices.serviceName,
      description: caseServices.description,
      quantity: caseServices.quantity,
      unitPrice: caseServices.unitPrice,
      totalPrice: caseServices.totalPrice,
    })
    .from(caseServices)
    .where(eq(caseServices.caseId, caseId));

  const items = [
    ...parts.map((part: {
      id: number;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
      notes: string | null;
      inventoryName: string | null;
      inventoryCode: string | null;
    }) => ({
      itemType: "part",
      referenceId: part.id,
      name: part.inventoryName || "قطعة غيار",
      description: [part.inventoryCode, part.notes].filter(Boolean).join(" - ") || null,
      quantity: part.quantity,
      unitPrice: String(part.unitPrice),
      totalPrice: String(part.totalPrice),
    })),
    ...services.map((service: {
      id: number;
      serviceName: string;
      description: string | null;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }) => ({
      itemType: "service",
      referenceId: service.id,
      name: service.serviceName,
      description: service.description,
      quantity: service.quantity,
      unitPrice: String(service.unitPrice),
      totalPrice: String(service.totalPrice),
    })),
  ];

  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

  return { items, subtotal };
};

export const invoicesService = {
  async createInvoiceFromCase(caseId: number, input: CreateInvoiceInput, createdBy: number): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const foundCase = await tx
        .select({
          id: cases.id,
          customerId: cases.customerId,
          caseCode: cases.caseCode,
        })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);

      if (!foundCase.length) {
        throw new Error("Case not found");
      }

      const existingInvoice = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.caseId, caseId))
        .limit(1);

      if (existingInvoice.length) {
        throw new Error("Invoice already exists for this case");
      }

      const invoiceData = await buildMaintenanceInvoiceItems(tx, caseId);
      const discount = input.discount || 0;
      const tax = input.tax || 0;
      const total = invoiceData.subtotal - discount + tax;
      const invoiceNumber = `INV-${foundCase[0].caseCode}-${Date.now()}`;

      const createdInvoices = await tx
        .insert(invoices)
        .values({
          caseId,
          customerId: foundCase[0].customerId,
          invoiceType: "maintenance",
          invoiceNumber,
          subtotal: invoiceData.subtotal.toString(),
          discount: discount.toString(),
          tax: tax.toString(),
          total: total.toString(),
          notes: input.notes,
          createdBy,
        })
        .returning({ id: invoices.id });

      const invoiceId = createdInvoices[0].id;

      if (invoiceData.items.length > 0) {
        await tx.insert(invoiceItems).values(
          invoiceData.items.map((item) => ({
            invoiceId,
            ...item,
          }))
        );
      }

      const [createdInvoice] = await getInvoiceRows(tx, eq(invoices.id, invoiceId));
      return createdInvoice as Invoice;
    });
  },

  async createDirectInvoice(input: CreateDirectInvoiceInput, createdBy: number): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const inventoryIds = [...new Set(input.items.map((item) => item.referenceId))];
      const foundInventoryItems = await tx
        .select()
        .from(inventoryItems)
        .where(inArray(inventoryItems.id, inventoryIds));

      const inventoryById = new Map(foundInventoryItems.map((item) => [item.id, item]));
      const invoiceInputItems = input.items.map((item) => {
        const inventoryItem = inventoryById.get(item.referenceId);
        if (!inventoryItem) {
          throw new Error("Selected inventory item was not found");
        }

        if (item.quantity > inventoryItem.quantity) {
          throw new Error(`Insufficient warehouse stock for ${inventoryItem.name}`);
        }

        const unitPrice = item.unitPrice ?? Number(inventoryItem.sellingPrice || inventoryItem.unitCost || 0);

        return {
          referenceId: item.referenceId,
          quantity: item.quantity,
          unitPrice,
          name: inventoryItem.name,
          description: item.description || inventoryItem.code,
        };
      });

      const subtotal = invoiceInputItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const discount = input.discount || 0;
      const tax = input.tax || 0;
      const total = subtotal - discount + tax;

      await tx.execute(sql`LOCK TABLE "invoices" IN EXCLUSIVE MODE`);
      const saleCode = await generateSaleCode(tx, "S");

      const createdInvoices = await tx
        .insert(invoices)
        .values({
          caseId: null,
          customerId: input.customerId,
          invoiceType: "direct_sale",
          directCustomerName: input.directCustomerName,
          directCustomerPhone: input.directCustomerPhone,
          invoiceNumber: saleCode,
          saleCode,
          status: SALE_STATUS.DRAFT,
          subtotal: subtotal.toString(),
          discount: discount.toString(),
          tax: tax.toString(),
          total: total.toString(),
          notes: input.notes,
          createdBy,
        })
        .returning({ id: invoices.id });

      const invoiceId = createdInvoices[0].id;

      await tx.insert(invoiceItems).values(
        invoiceInputItems.map((item) => ({
          invoiceId,
          itemType: "direct_part",
          referenceId: item.referenceId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: (item.quantity * item.unitPrice).toString(),
        }))
      );

      const [createdInvoice] = await getInvoiceRows(tx, eq(invoices.id, invoiceId));
      return createdInvoice as Invoice;
    });
  },

  async confirmDirectInvoice(id: number, confirmedBy: number): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const foundInvoices = await tx
        .select({
          id: invoices.id,
          invoiceType: invoices.invoiceType,
          saleCode: invoices.saleCode,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
        })
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      const invoice = foundInvoices[0];
      if (!invoice) {
        throw new Error("Sale not found");
      }

      if (invoice.invoiceType !== "direct_sale") {
        throw new Error("Only direct sales can be confirmed manually");
      }

      if (invoice.status === SALE_STATUS.CANCELLED) {
        throw new Error("Cancelled sales cannot be confirmed");
      }

      if (invoice.status === SALE_STATUS.PAID) {
        const [confirmedInvoice] = await getInvoiceRows(tx, eq(invoices.id, id));
        return confirmedInvoice as Invoice;
      }

      const items = await tx
        .select({
          id: invoiceItems.id,
          referenceId: invoiceItems.referenceId,
          quantity: invoiceItems.quantity,
        })
        .from(invoiceItems)
        .where(and(eq(invoiceItems.invoiceId, id), eq(invoiceItems.itemType, "direct_part")));

      const inventoryIds = items
        .map((item) => item.referenceId)
        .filter((value): value is number => typeof value === "number");

      const stockRows = inventoryIds.length
        ? await tx
            .select({
              id: inventoryItems.id,
              name: inventoryItems.name,
              quantity: inventoryItems.quantity,
            })
            .from(inventoryItems)
            .where(inArray(inventoryItems.id, inventoryIds))
        : [];

      const stockById = new Map(stockRows.map((item) => [item.id, item]));

      for (const item of items) {
        if (!item.referenceId) {
          throw new Error("Sale item is missing its inventory reference");
        }

        const stockItem = stockById.get(item.referenceId);
        if (!stockItem || stockItem.quantity < item.quantity) {
          throw new Error(`Insufficient warehouse stock to confirm ${stockItem?.name || "this sale item"}`);
        }
      }

      const confirmedAt = new Date();

      for (const item of items) {
        if (!item.referenceId) continue;

        await tx
          .update(inventoryItems)
          .set({
            quantity: sql`${inventoryItems.quantity} - ${item.quantity}`,
            updatedAt: confirmedAt,
          })
          .where(eq(inventoryItems.id, item.referenceId));

        await tx.insert(inventoryMovements).values({
          inventoryItemId: item.referenceId,
          movementType: "sold_direct",
          quantity: -item.quantity,
          referenceType: "invoice",
          referenceId: id,
          notes: `Direct sale confirmed via ${invoice.saleCode || invoice.invoiceNumber}`,
          createdBy: confirmedBy,
          createdAt: confirmedAt,
        });
      }

      await tx
        .update(invoices)
        .set({
          status: SALE_STATUS.PAID,
          issuedAt: confirmedAt,
          confirmedAt,
          confirmedBy,
          updatedAt: confirmedAt,
        })
        .where(eq(invoices.id, id));

      const [confirmedInvoice] = await getInvoiceRows(tx, eq(invoices.id, id));
      return confirmedInvoice as Invoice;
    });
  },

  async syncMaintenanceSaleForFinalizedCase(tx: any, caseId: number, confirmedBy: number, happenedAt: Date) {
    const foundCases = await tx
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        createdBy: cases.createdBy,
      })
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);

    const caseRow = foundCases[0];
    if (!caseRow) {
      throw new Error("Case not found");
    }

    const invoiceData = await buildMaintenanceInvoiceItems(tx, caseId);

    const existingInvoices = await tx
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        discount: invoices.discount,
        tax: invoices.tax,
        notes: invoices.notes,
        saleCode: invoices.saleCode,
      })
      .from(invoices)
      .where(eq(invoices.caseId, caseId))
      .limit(1);

    let invoiceId: number;
    let discount = 0;
    let tax = 0;
    let saleCode = existingInvoices[0]?.saleCode ?? null;

    if (existingInvoices.length) {
      invoiceId = existingInvoices[0].id;
      discount = Number(existingInvoices[0].discount || 0);
      tax = Number(existingInvoices[0].tax || 0);
    } else {
      await tx.execute(sql`LOCK TABLE "invoices" IN EXCLUSIVE MODE`);
      saleCode = await generateSaleCode(tx, "MS");

      const createdInvoices = await tx
        .insert(invoices)
        .values({
          caseId,
          customerId: caseRow.customerId,
          invoiceType: "maintenance",
          invoiceNumber: `INV-${caseRow.caseCode}-${happenedAt.getTime()}`,
          saleCode,
          status: SALE_STATUS.PAID,
          subtotal: invoiceData.subtotal.toString(),
          discount: "0",
          tax: "0",
          total: invoiceData.subtotal.toString(),
          issuedAt: happenedAt,
          confirmedAt: happenedAt,
          confirmedBy,
          createdBy: caseRow.createdBy,
        })
        .returning({ id: invoices.id });

      invoiceId = createdInvoices[0].id;
    }

    if (!saleCode) {
      await tx.execute(sql`LOCK TABLE "invoices" IN EXCLUSIVE MODE`);
      saleCode = await generateSaleCode(tx, "MS");
    }

    const total = invoiceData.subtotal - discount + tax;

    await tx
      .update(invoices)
      .set({
        customerId: caseRow.customerId,
        saleCode,
        status: SALE_STATUS.PAID,
        subtotal: invoiceData.subtotal.toString(),
        total: total.toString(),
        issuedAt: happenedAt,
        confirmedAt: happenedAt,
        confirmedBy,
        updatedAt: happenedAt,
      })
      .where(eq(invoices.id, invoiceId));

    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

    if (invoiceData.items.length) {
      await tx.insert(invoiceItems).values(
        invoiceData.items.map((item) => ({
          invoiceId,
          ...item,
        }))
      );
    }
  },

  async getAllInvoices(): Promise<Invoice[]> {
    const rows = await getInvoiceRows(
      db,
      sql`${invoices.invoiceType} = 'direct_sale' or (${invoices.invoiceType} = 'maintenance' and ${invoices.status} = ${SALE_STATUS.PAID})`
    );
    return rows as Invoice[];
  },

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const rows = await getInvoiceRows(db, eq(invoices.id, id));
    return rows[0] as Invoice | undefined;
  },

  async getInvoiceWithItems(id: number): Promise<{ invoice: Invoice; items: InvoiceItem[] } | undefined> {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) return undefined;

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.createdAt);

    return { invoice, items };
  },

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "issued") {
      updateData.issuedAt = new Date();
    }

    const updated = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning({ id: invoices.id });

    if (!updated[0]) {
      return undefined;
    }

    return await this.getInvoiceById(id);
  },
};
