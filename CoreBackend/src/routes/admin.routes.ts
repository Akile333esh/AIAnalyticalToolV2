import { Router } from "express";
import asyncHandler from "express-async-handler";
import sql from "mssql";
import { authRequired } from "../middleware/authRequired";
import { requireRole } from "../middleware/requireRole";
import { getMasterPool } from "../db/masterDb";
import { StatusCodes } from "http-status-codes";

const router = Router();

// all admin routes require admin role
router.use(authRequired, requireRole("admin"));

// GET /admin/users -> list users
router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const pool = await getMasterPool();
    const result = await pool
      .request()
      .query(
        "SELECT Id, Email, Role, CreatedAt, UpdatedAt, IsActive FROM Users ORDER BY CreatedAt DESC"
      );
    res.json({ users: result.recordset });
  })
);

// POST /admin/users/:id/role -> change role
router.post(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;

    const pool = await getMasterPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Role", sql.NVarChar, role)
      .query(
        "UPDATE Users SET Role = @Role, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id"
      );

    res.status(StatusCodes.OK).json({ message: "Role updated" });
  })
);

export default router;
