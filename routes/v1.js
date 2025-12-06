const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const authController = require("../controllers/authController");
require("dotenv").config();

const SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "no token" });

  try {
    const verified = jwt.verify(token, SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: "wrong token" });
  }
};

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/createTask", authMiddleware, authController.createTask);
router.post("/removeTask", authMiddleware, authController.removeTask);
router.get("/viewTasks", authMiddleware, authController.viewTasks);
router.post("/editTask", authMiddleware, authController.editTask);
router.post("/finishTask", authMiddleware, authController.finishTask);
router.post("/changeUserPassword", authMiddleware, authController.changeUserPassword);
router.get("/updateApp", authMiddleware, authController.updateApp);
router.post("/deactivateUser", authMiddleware, authController.deactivateUser);
router.get("/viewUsers", authMiddleware, authController.viewUsers);
router.get("/viewLogs", authMiddleware, authController.viewLogs);
router.get("/sendOverdueTasks", authMiddleware, authController.sendOverdueTasks);
router.get("/sendReminderTasks", authMiddleware, authController.sendReminderTasks);
router.post("/decPoints", authMiddleware, authController.decPoints);
router.post("/incPoints", authMiddleware, authController.incPoints);
router.get("/getPoints", authMiddleware, authController.getPoints);

module.exports = router;
