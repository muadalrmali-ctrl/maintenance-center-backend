import { db } from "../../db";
import { invoices, invoiceItems, cases, caseParts, caseServices, customers, devices, inventoryItems } from "../../db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";

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
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string | null;
  issuedAt: Date | null;
  createdBy: number;
  createdAt: Date | null;
  updatedAt: Date | null;
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

export const invoicesService = {
  async createInvoiceFromCase(caseId: number, input: CreateInvoiceInput, createdBy: number): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      // Verify case exists
      const foundCase = await tx
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);

      if (!foundCase.length) {
        throw new Error("Case not found");
      }

      // Check if invoice already exists for this case
      const existingInvoice = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.caseId, caseId))
        .limit(1);

      if (existingInvoice.length) {
        throw new Error("Invoice already exists for this case");
      }

      // Get case parts and services
      const parts = await tx
        .select()
        .from(caseParts)
        .where(eq(caseParts.caseId, caseId));

      const services = await tx
        .select()
        .from(caseServices)
        .where(eq(caseServices.caseId, caseId));

      // Calculate subtotal
      const partsSubtotal = parts.reduce((sum, part) => sum + parseFloat(part.totalPrice), 0);
      const servicesSubtotal = services.reduce((sum, service) => sum + parseFloat(service.totalPrice), 0);
      const subtotal = partsSubtotal + servicesSubtotal;

      const discount = input.discount || 0;
      const tax = input.tax || 0;
      const total = subtotal - discount + tax;

      // Generate invoice number (simple for v1)
      const invoiceNumber = `INV-${caseId}-${Date.now()}`;

      // Create invoice
      const newInvoice = await tx
        .insert(invoices)
        .values({
          caseId,
          customerId: foundCase[0].customerId,
          invoiceType: "maintenance",
          invoiceNumber,
          subtotal: subtotal.toString(),
          discount: discount.toString(),
          tax: tax.toString(),
          total: total.toString(),
          notes: input.notes,
          createdBy,
        })
        .returning();

      const invoice = newInvoice[0];

      // Create invoice items
      const invoiceItemsData = [
        ...parts.map(part => ({
          invoiceId: invoice.id,
          itemType: "part" as const,
          referenceId: part.id,
          name: `Part: ${part.notes || "Spare Part"}`,
          description: part.notes,
          quantity: part.quantity,
          unitPrice: part.unitPrice,
          totalPrice: part.totalPrice,
        })),
        ...services.map(service => ({
          invoiceId: invoice.id,
          itemType: "service" as const,
          referenceId: service.id,
          name: service.serviceName,
          description: service.description,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          totalPrice: service.totalPrice,
        })),
      ];

      if (invoiceItemsData.length > 0) {
        await tx.insert(invoiceItems).values(invoiceItemsData);
      }

      return invoice;
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
          throw new Error(`Insufficient stock for ${inventoryItem.name}`);
        }

        const unitPrice = item.unitPrice ?? Number(inventoryItem.sellingPrice || inventoryItem.unitCost || 0);

        return {
          ...item,
          unitPrice,
          name: inventoryItem.name,
          description: item.description || inventoryItem.code,
        };
      });

      const subtotal = invoiceInputItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const discount = input.discount || 0;
      const tax = input.tax || 0;
      const total = subtotal - discount + tax;
      const invoiceNumber = `SALE-${Date.now()}`;

      const createdInvoices = await tx
        .insert(invoices)
        .values({
          caseId: null,
          customerId: input.customerId,
          invoiceType: "direct_sale",
          directCustomerName: input.directCustomerName,
          directCustomerPhone: input.directCustomerPhone,
          invoiceNumber,
          subtotal: subtotal.toString(),
          discount: discount.toString(),
          tax: tax.toString(),
          total: total.toString(),
          notes: input.notes,
          createdBy,
        })
        .returning();

      const invoice = createdInvoices[0];

      await tx.insert(invoiceItems).values(invoiceInputItems.map((item) => ({
        invoiceId: invoice.id,
        itemType: "direct_part",
        referenceId: item.referenceId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: (item.quantity * item.unitPrice).toString(),
      })));

      for (const item of invoiceInputItems) {
        await tx
          .update(inventoryItems)
          .set({
            quantity: sql`${inventoryItems.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, item.referenceId));
      }

      return invoice;
    });
  },

  async getAllInvoices(): Promise<Invoice[]> {
    return await db
      .select({
        id: invoices.id,
        caseId: invoices.caseId,
        customerId: invoices.customerId,
        invoiceType: invoices.invoiceType,
        directCustomerName: invoices.directCustomerName,
        directCustomerPhone: invoices.directCustomerPhone,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        subtotal: invoices.subtotal,
        discount: invoices.discount,
        tax: invoices.tax,
        total: invoices.total,
        notes: invoices.notes,
        issuedAt: invoices.issuedAt,
        createdBy: invoices.createdBy,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        caseCode: cases.caseCode,
        customerName: customers.name,
        customerPhone: customers.phone,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
      })
      .from(invoices)
      .leftJoin(cases, eq(invoices.caseId, cases.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .orderBy(desc(invoices.createdAt));
  },

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    return result[0];
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
    const updateData: any = {
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
      .returning();

    return updated[0];
  },
};
