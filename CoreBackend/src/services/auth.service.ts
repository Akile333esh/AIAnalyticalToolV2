import bcrypt from "bcryptjs";
import sql from "mssql";
import { getMasterPool } from "../db/masterDb";
import { signAccessToken } from "../utils/token";
import { config } from "../config/env";
import { v4 as uuidv4 } from "uuid";

interface UserRecord {
  Id: number;
  Email: string;
  PasswordHash: string;
  Role: string;
}

export async function registerUser(email: string, password: string): Promise<UserRecord> {
  // 1. Basic Validation
  if (!email || !email.includes("@")) {
    throw new Error("Invalid email address");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const pool = await getMasterPool();

  // 2. Check if user already exists
  const existing = await pool.request()
    .input("Email", sql.NVarChar, email)
    .query("SELECT TOP 1 * FROM Users WHERE Email = @Email");

  if (existing.recordset.length > 0) {
    throw new Error("User already exists");
  }

  const hash = await bcrypt.hash(password, 10);

  // 3. Determine Role based on Config
  // If the registering email matches the ADMIN_EMAIL env var, they are an Admin.
  const role = (config.ADMIN_EMAIL && email.toLowerCase() === config.ADMIN_EMAIL.toLowerCase()) 
    ? "admin" 
    : "user";

  const result = await pool.request()
    .input("Email", sql.NVarChar, email)
    .input("PasswordHash", sql.NVarChar, hash)
    .input("Role", sql.NVarChar, role) // 👈 Dynamic role
    .query(`
      INSERT INTO Users (Email, PasswordHash, Role)
      OUTPUT INSERTED.*
      VALUES (@Email, @PasswordHash, @Role)
    `);

  return result.recordset[0];
}

export async function loginUser(email: string, password: string) {
  const pool = await getMasterPool();

  const result = await pool.request()
    .input("Email", sql.NVarChar, email)
    .query("SELECT TOP 1 * FROM Users WHERE Email = @Email");

  const user = result.recordset[0];
  if (!user) throw new Error("Invalid email or password");

  const valid = await bcrypt.compare(password, user.PasswordHash);
  if (!valid) throw new Error("Invalid email or password");

  const accessToken = signAccessToken({ userId: user.Id, role: user.Role });

  const refreshToken = uuidv4(); // random UUID token string

  await pool.request()
    .input("UserId", sql.Int, user.Id)
    .input("Token", sql.NVarChar, refreshToken)
    .query(`
      INSERT INTO RefreshTokens (UserId, Token, ExpiresAt, CreatedAt, IsRevoked)
      VALUES (@UserId, @Token, DATEADD(day, 7, SYSUTCDATETIME()), SYSUTCDATETIME(), 0)
    `);

  return { user, accessToken, refreshToken };
}

export async function refreshTokens(token: string) {
  const pool = await getMasterPool();

  const result = await pool.request()
    .input("Token", sql.NVarChar, token)
    .query(`
      SELECT rt.*, u.Id as UserId, u.Role
      FROM RefreshTokens rt
      JOIN Users u ON u.Id = rt.UserId
      WHERE rt.Token = @Token AND rt.IsRevoked = 0 AND rt.ExpiresAt > SYSUTCDATETIME()
    `);

  const row = result.recordset[0];
  if (!row) throw new Error("Invalid or expired refresh token");

  const newAccess = signAccessToken({ userId: row.UserId, role: row.Role });
  const newRefresh = uuidv4();

  // rotate token
  await pool.request()
    .input("OldToken", sql.NVarChar, token)
    .input("NewToken", sql.NVarChar, newRefresh)
    .query(`
      UPDATE RefreshTokens SET
        Token = @NewToken,
        ExpiresAt = DATEADD(day, 7, SYSUTCDATETIME()),
        UpdatedAt = SYSUTCDATETIME()
      WHERE Token = @OldToken
    `);

  return { newAccess, newRefresh };
}

export async function logout(refreshToken: string) {
  const pool = await getMasterPool();

  await pool.request()
    .input("Token", sql.NVarChar, refreshToken)
    .query(`
      UPDATE RefreshTokens SET
        IsRevoked = 1,
        UpdatedAt = SYSUTCDATETIME()
      WHERE Token = @Token
    `);
}
