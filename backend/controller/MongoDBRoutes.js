// routes/userRoutes.js
import express from "express";
import {
    createUser,
    deleteUser,
    getUserById,
    updateUser,
} from "../controllers/UserController.js";

const router = express.Router();

router.post("/action", async (req, res) => {
  const { actionType, payload } = req.body;

  try {
    switch (actionType) {
      case "create":
        return await createUser(req, res);

      case "update":
        return await updateUser(req, res);

      case "delete":
        return await deleteUser(req, res);

      case "get":
        return await getUserById(req, res);

      default:
        return res.status(400).json({ message: "Invalid action type" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
