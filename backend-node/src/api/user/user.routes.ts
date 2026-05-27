import { Router } from "express";
import { getUserCredits, getCreditHistory } from "./user.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.use(verifyUser);

/**
 * @route   GET /api/user/credits
 * @desc    Current credit balance + lifetime usage
 * @access  Private
 */
router.get("/credits", getUserCredits);

/**
 * @route   GET /api/user/credit-history
 * @desc    Paginated credit transaction log
 * @access  Private
 * @query   limit (default 20, max 100)
 */
router.get("/credit-history", getCreditHistory);

export default router;
