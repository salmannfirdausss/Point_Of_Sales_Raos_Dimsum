const express = require("express");
const verifyToken = require("../middlewares/verify-token");
const verifyRole = require("../middlewares/verify-role");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category-controller");

const router = express.Router();
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", verifyToken, verifyRole(["admin", "master"]), createCategory);
router.put("/:id", verifyToken, verifyRole(["admin", "master"]), updateCategory);
router.delete("/:id", verifyToken, verifyRole(["admin", "master"]), deleteCategory);

module.exports = router;