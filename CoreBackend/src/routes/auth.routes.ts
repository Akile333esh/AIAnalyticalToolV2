import { Router } from "express";
import asyncHandler from "express-async-handler";
import { registerUser, loginUser, refreshTokens, logout } from "../services/auth.service";
import { authRequired } from "../middleware/authRequired";
import { verifyAccessToken } from "../utils/token";
import { StatusCodes } from "http-status-codes";

const router = Router();
const REFRESH_COOKIE_NAME = "jid";

// Register
router.post("/register", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await registerUser(email, password);
  res.json({ message: "User registered", user: { email: user.Email, role: user.Role } });
}));

// Login
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await loginUser(email, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: false,      // ❗ Change to true in production (HTTPS only)
    sameSite: "lax"
  });

  res.json({ accessToken });
}));

// Refresh
router.post("/refresh", asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (!token) return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Refresh token required" });

  const { newAccess, newRefresh } = await refreshTokens(token);

  res.cookie(REFRESH_COOKIE_NAME, newRefresh, {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  });

  res.json({ accessToken: newAccess });
}));

// Me
router.get("/me", authRequired, (req, res) => {
  res.json({ user: (req as any).user });
});

// Logout
router.post("/logout", asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (token) await logout(token);

  res.clearCookie(REFRESH_COOKIE_NAME);
  res.json({ message: "Logged out" });
}));

export default router;
