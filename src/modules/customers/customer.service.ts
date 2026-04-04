import { db } from "../../db";
import { customers } from "../../db/schema";
import { eq } from "drizzle-orm";

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
    return await db.select().from(customers);
  },

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const foundCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    return foundCustomers[0];
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