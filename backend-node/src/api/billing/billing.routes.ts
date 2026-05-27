import { Router } from "express";
import { verifyUser } from "../../middleware/auth";
import {
  listPlans,
  getStatus,
  subscribe,
  topup,
  cancelSubscription,
  listInvoices,
  getInvoice,
  creatorSummary,
} from "./billing.controller";

const router = Router();

router.get("/plans", listPlans);

router.use(verifyUser);

router.get("/status", getStatus);
router.post("/subscribe", subscribe);
router.post("/cancel", cancelSubscription);
router.post("/credits/topup", topup);
router.get("/invoices", listInvoices);
router.get("/invoices/:invoiceId", getInvoice);
router.get("/creator-summary", creatorSummary);

export default router;
