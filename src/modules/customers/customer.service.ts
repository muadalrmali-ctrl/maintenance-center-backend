import { db } from "../../db";
import { cases, customers, devices, invoices } from "../../db/schema";
import { desc, eq, or, sql } from "drizzle-orm";

type CreateCustomerInput = {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdBy: number;
};

type UpdateCustomerInput = {
  name?: string;
  phone?: string;
  address?: string | null;
  notes?: string | null;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  casesCount?: number;
};

export const customerService = {
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const createdCustomers = await db
      .insert(customers)
      .values({
        name: input.name,
        phone: input.phone,
        address: input.address,
        notes: input.notes,
        createdBy: input.createdBy,
      })
      .returning({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        notes: customers.notes,
        createdBy: customers.createdBy,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      });

    return createdCustomers[0];
  },

  async getCustomers(): Promise<Customer[]> {
    return await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        notes: customers.notes,
        createdBy: customers.createdBy,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        casesCount: sql<number>`count(${cases.id})::int`,
      })
      .from(customers)
      .leftJoin(cases, eq(cases.customerId, customers.id))
      .groupBy(
        customers.id,
        customers.name,
        customers.phone,
        customers.address,
        customers.notes,
        customers.createdBy,
        customers.createdAt,
        customers.updatedAt
      )
      .orderBy(desc(customers.createdAt));
  },

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const foundCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    return foundCustomers[0];
  },

  async getCustomerDetails(id: number): Promise<any | undefined> {
    const customer = await this.getCustomerById(id);
    if (!customer) return undefined;

    const customerCases = await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        priority: cases.priority,
        createdAt: cases.createdAt,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
      })
      .from(cases)
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .where(eq(cases.customerId, id));

    const customerInvoices = await db
      .select({
        id: invoices.id,
        caseId: invoices.caseId,
        customerId: invoices.customerId,
        invoiceType: invoices.invoiceType,
        directCustomerName: invoices.directCustomerName,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(cases, eq(invoices.caseId, cases.id))
      .where(or(eq(invoices.customerId, id), eq(cases.customerId, id)));

    return {
      customer,
      cases: customerCases,
      invoices: customerInvoices,
    };
  },

  async updateCustomer(id: number, input: UpdateCustomerInput): Promise<Customer | undefined> {
    const updateData: Partial<UpdateCustomerInput & { updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updatedCustomers = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        notes: customers.notes,
        createdBy: customers.createdBy,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      });

    return updatedCustomers[0];
  },
};
