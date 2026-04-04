import { db } from "../../db";
import { invoices, invoiceItems, cases, caseParts, caseServices } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

type CreateInvoiceInput = {
  discount?: number;
  tax?: number;
  notes?: string;
};

type Invoice = {
  id: number;
  caseId: number;
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

  async getAllInvoices(): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
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