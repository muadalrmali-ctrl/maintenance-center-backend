import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { inArray, eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { env } from "../../config/env";

type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

type LoginUserInput = {
  email: string;
  password: string;
};

type LoginResult = {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: Date | null;
  };
  token: string;
};

export const authService = {
  async getTechnicians() {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.role, ["technician", "technician_manager"]));
  },

  async registerUser(input: RegisterUserInput) {
    const { name, email, password, role = "technician" } = input;

    const allowedRoles = ["admin", "receptionist", "technician", "store_manager", "technician_manager"];
    if (!allowedRoles.includes(role)) {
      throw new Error("Invalid role specified");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUsers = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return createdUsers[0];
  },

  async loginUser(data: LoginUserInput): Promise<LoginResult> {
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    const user = foundUsers[0];

    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new Error("Invalid password");
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN,
      }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  },
};
