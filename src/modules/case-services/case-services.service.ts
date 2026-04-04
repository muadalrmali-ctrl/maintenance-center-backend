import { db } from "../../db";
import { caseServices, cases } from "../../db/schema";
import { eq } from "drizzle-orm";

type AddServiceInput = {
  serviceName: string;
  description?: string;
  unitPrice: number;
  quantity?: number;
  performedBy?: number;
  createdBy: number;
};

type CaseService = {
  id: number;
  caseId: number;
  serviceName: string;
  description: string | null;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  performedBy: number | null;
  createdBy: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const caseServicesService = {
  async addService(caseId: number, input: AddServiceInput): Promise<CaseService> {
    // Verify case exists
    const caseExists = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);

    if (!caseExists.length) {
      throw new Error("Case not found");
    }

    const quantity = input.quantity || 1;
    const totalPrice = input.unitPrice * quantity;

    const createdServices = await db
      .insert(caseServices)
      .values({
        caseId,
        serviceName: input.serviceName,
        description: input.description,
        unitPrice: input.unitPrice.toString(),
        quantity,
        totalPrice: totalPrice.toString(),
        performedBy: input.performedBy,
        createdBy: input.createdBy,
      })
      .returning({
        id: caseServices.id,
        caseId: caseServices.caseId,
        serviceName: caseServices.serviceName,
        description: caseServices.description,
        unitPrice: caseServices.unitPrice,
        quantity: caseServices.quantity,
        totalPrice: caseServices.totalPrice,
        performedBy: caseServices.performedBy,
        createdBy: caseServices.createdBy,
        createdAt: caseServices.createdAt,
        updatedAt: caseServices.updatedAt,
      });

    return createdServices[0];
  },

  async getCaseServices(caseId: number): Promise<CaseService[]> {
    return await db
      .select()
      .from(caseServices)
      .where(eq(caseServices.caseId, caseId));
  },
};