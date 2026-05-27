import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { billingService } from "../../services/billing.service";

const SubscribeSchema = z.object({ planId: z.string().min(1) });
const TopupSchema = z.object({ amount: z.number().int().positive() });

export async function listPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await billingService.listPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await billingService.getStatus(req.user!.sub);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const { planId } = SubscribeSchema.parse(req.body);
    const result = await billingService.subscribe(req.user!.sub, planId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function topup(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount } = TopupSchema.parse(req.body);
    const result = await billingService.topup(req.user!.sub, amount);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await billingService.cancelSubscription(req.user!.sub);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await billingService.listInvoices(req.user!.sub);
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await billingService.getInvoice(req.user!.sub, req.params["invoiceId"]!);
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function creatorSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await billingService.getCreatorSummary(req.user!.sub);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}
