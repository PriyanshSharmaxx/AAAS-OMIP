/**
 * src/api/marketplace/marketplace.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import {
  marketplaceService,
  CreateListingSchema,
  UpdateListingSchema,
  ReviewSchema,
  UseApiSchema,
  BrowseSchema,
} from "../../services/marketplace.service";
import { AppError } from "../../middleware/errorHandler";

// ── Browse / Discovery ────────────────────────────────────────────────────────

// GET /api/marketplace/browse
export async function browse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = BrowseSchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const listings = await marketplaceService.browse(parsed.data);
    res.json({ success: true, data: listings, total: listings.length });
  } catch (err) { next(err); }
}

// GET /api/marketplace/:id
export async function getListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await marketplaceService.getListing(req.params.id!);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
}

// ── Creator — listing management ──────────────────────────────────────────────

// GET /api/marketplace/my-listings
export async function myListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listings = await marketplaceService.myListings(req.user!.sub);
    res.json({ success: true, data: listings, total: listings.length });
  } catch (err) { next(err); }
}

// POST /api/marketplace
export async function createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateListingSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const listing = await marketplaceService.createListing(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: listing });
  } catch (err) { next(err); }
}

// PATCH /api/marketplace/:id
export async function updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateListingSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const listing = await marketplaceService.updateListing(req.params.id!, req.user!.sub, parsed.data);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
}

// POST /api/marketplace/:id/publish
export async function publishListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await marketplaceService.publish(req.params.id!, req.user!.sub);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
}

// POST /api/marketplace/:id/unpublish
export async function unpublishListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await marketplaceService.unpublish(req.params.id!, req.user!.sub);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
}

// ── Consumer — subscription management ───────────────────────────────────────

// GET /api/marketplace/my-subscriptions
export async function mySubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subs = await marketplaceService.mySubscriptions(req.user!.sub);
    res.json({ success: true, data: subs, total: subs.length });
  } catch (err) { next(err); }
}

// POST /api/marketplace/:id/subscribe
export async function subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sub = await marketplaceService.subscribe(req.params.id!, req.user!.sub);
    res.status(201).json({ success: true, data: sub });
  } catch (err) { next(err); }
}

// DELETE /api/marketplace/:id/subscribe
export async function unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await marketplaceService.unsubscribe(req.params.id!, req.user!.sub);
    res.json({ success: true, message: "Unsubscribed successfully." });
  } catch (err) { next(err); }
}

// ── API execution — X-API-Key auth, no JWT required ──────────────────────────

// POST /api/marketplace/use
export async function useApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || typeof apiKey !== "string") {
      return next(new AppError("X-API-Key header is required.", 401, "MISSING_API_KEY"));
    }

    const parsed = UseApiSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));

    const result = await marketplaceService.useApi(apiKey, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

// GET /api/marketplace/:id/reviews
export async function getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string ?? "20", 10) || 20, 50);
    const reviews = await marketplaceService.getReviews(req.params.id!, limit);
    res.json({ success: true, data: reviews, total: reviews.length });
  } catch (err) { next(err); }
}

// POST /api/marketplace/:id/reviews
export async function submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ReviewSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const review = await marketplaceService.submitReview(req.params.id!, req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
}

// DELETE /api/marketplace/:id/reviews
export async function deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await marketplaceService.deleteReview(req.params.id!, req.user!.sub);
    res.json({ success: true, message: "Review deleted." });
  } catch (err) { next(err); }
}
