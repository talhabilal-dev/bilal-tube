import { z } from "zod";

export const registerUserSchema = z.object({
  username: z
    .string({ error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .transform((value) => value.toLowerCase()),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Invalid email format")
    .transform((value) => value.toLowerCase()),
  fullName: z
    .string({ error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(60, "Full name must not exceed 60 characters"),
  password: z
    .string({ error: "Password is required" })
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});

export const loginUserSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Invalid email format")
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: "Password is required" })
    .trim()
    .min(1, "Password is required"),
});

export const refreshAccessTokenSchema = z.object({
  refreshToken: z
    .string()
    .trim()
    .min(1, "Refresh token is required")
    .optional(),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string({ error: "Old password is required" })
      .trim()
      .min(1, "Old password is required"),
    currentPassword: z
      .string({ error: "Current password is required" })
      .trim()
      .min(8, "Current password must be at least 8 characters")
      .max(128, "Current password must not exceed 128 characters"),
  })
  .refine((data) => data.oldPassword !== data.currentPassword, {
    message: "New password must be different from old password",
    path: ["currentPassword"],
  });

export const updateAccountDetailsSchema = z.object({
  username: z
    .string({ error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .transform((value) => value.toLowerCase()),
  fullName: z
    .string({ error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(60, "Full name must not exceed 60 characters"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Invalid email format")
    .transform((value) => value.toLowerCase()),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type RefreshAccessTokenInput = z.infer<typeof refreshAccessTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateAccountDetailsInput = z.infer<
  typeof updateAccountDetailsSchema
>;
