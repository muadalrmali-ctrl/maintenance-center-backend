import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { suppliers } from "../../db/schema";

type CreateSupplierInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  createdBy: number;
};

type UpdateSupplierInput = Partial<Omit<CreateSupplierInput, "createdBy">>;

const supplierSelect = {
  id: suppliers.id,
  name: suppliers.name,
  phone: suppliers.phone,
  email: suppliers.email,
  address: suppliers.address,
  contactPerson: suppliers.contactPerson,
  notes: suppliers.notes,
  createdBy: suppliers.createdBy,
  createdAt: suppliers.createdAt,
  updatedAt: suppliers.updatedAt,
};

export const accountingService = {
  async getSuppliers() {
    return await db.select(supplierSelect).from(suppliers).orderBy(desc(suppliers.createdAt));
  },

  async createSupplier(input: CreateSupplierInput) {
    const rows = await db
      .insert(suppliers)
      .values({
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        address: input.address,
        contactPerson: input.contactPerson,
        notes: input.notes,
        createdBy: input.createdBy,
      })
      .returning(supplierSelect);

    return rows[0];
  },

  async getSupplierById(id: number) {
    const rows = await db.select(supplierSelect).from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return rows[0];
  },

  async getSupplierDetails(id: number) {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return undefined;

    return { supplier };
  },

  async updateSupplier(id: number, input: UpdateSupplierInput) {
    const rows = await db
      .update(suppliers)
      .set({
        ...input,
        email: input.email === "" ? null : input.email,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning(supplierSelect);

    return rows[0];
  },
};
