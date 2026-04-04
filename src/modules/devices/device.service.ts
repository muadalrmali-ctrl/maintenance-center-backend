import { db } from "../../db";
import { devices } from "../../db/schema";
import { eq } from "drizzle-orm";

type CreateDeviceInput = {
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode?: string;
  notes?: string;
  createdBy: number;
};

type UpdateDeviceInput = {
  applianceType?: string;
  brand?: string;
  modelName?: string;
  modelCode?: string | null;
  notes?: string | null;
};

type Device = {
  id: number;
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const deviceService = {
  async createDevice(input: CreateDeviceInput): Promise<Device> {
    const createdDevices = await db
      .insert(devices)
      .values({
        applianceType: input.applianceType,
        brand: input.brand,
        modelName: input.modelName,
        modelCode: input.modelCode,
        notes: input.notes,
        createdBy: input.createdBy,
      })
      .returning({
        id: devices.id,
        applianceType: devices.applianceType,
        brand: devices.brand,
        modelName: devices.modelName,
        modelCode: devices.modelCode,
        notes: devices.notes,
        createdBy: devices.createdBy,
        createdAt: devices.createdAt,
        updatedAt: devices.updatedAt,
      });

    return createdDevices[0];
  },

  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  },

  async getDeviceById(id: number): Promise<Device | undefined> {
    const foundDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    return foundDevices[0];
  },

  async updateDevice(id: number, input: UpdateDeviceInput): Promise<Device | undefined> {
    const updateData: Partial<UpdateDeviceInput & { updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (input.applianceType !== undefined) updateData.applianceType = input.applianceType;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.modelName !== undefined) updateData.modelName = input.modelName;
    if (input.modelCode !== undefined) updateData.modelCode = input.modelCode;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updatedDevices = await db
      .update(devices)
      .set(updateData)
      .where(eq(devices.id, id))
      .returning({
        id: devices.id,
        applianceType: devices.applianceType,
        brand: devices.brand,
        modelName: devices.modelName,
        modelCode: devices.modelCode,
        notes: devices.notes,
        createdBy: devices.createdBy,
        createdAt: devices.createdAt,
        updatedAt: devices.updatedAt,
      });

    return updatedDevices[0];
  },
};