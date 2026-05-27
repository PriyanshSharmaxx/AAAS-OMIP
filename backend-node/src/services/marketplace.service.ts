/**
 * src/services/marketplace.service.ts
 *
 * API Marketplace — publish agents as API products, subscribe, and call them.
 *
 * Flow:
 *   Creator → publish agent as Listing (DRAFT → PUBLISHED)
 *   User    → subscribe to Listing → receives unique API key
 *   User    → POST /api/marketplace/use with X-API-Key header → runs agent
 *   Usage is tracked per-subscription; daily limit enforced
 */

import crypto from "crypto";
import { z } from "zod";
import {
  listingRepo, subscriptionRepo, reviewRepo,
  agentRepo, collectionRepo, ListingStatus, PricingModel,
} from "../lib/db";
import { RuntimeEngine } from "./runtime.service";
import { notificationService } from "./notification.service";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { userRepo } from "../lib/db";
import { billingService } from "./billing.service";

// ---------------------------------------------------------------------------
// API key generation
// ---------------------------------------------------------------------------

function generateApiKey(): string {
  return `omip_${crypto.randomBytes(24).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const CreateListingSchema = z.object({
  agentId:      z.string().uuid(),
  name:         z.string().min(2).max(100).trim(),
  tagline:      z.string().max(150).trim().default(""),
  description:  z.string().max(5000).trim().default(""),
  category:     z.string().max(50).default("general"),
  tags:         z.array(z.string().max(30)).max(10).default([]),
  iconUrl:      z.string().url().optional(),
  pricingModel: z.nativeEnum(PricingModel).default(PricingModel.FREE),
  pricePerRun:  z.number().min(0).max(100).optional(),
  priceMonthly: z.number().min(0).max(500).optional(),
  rateLimitPerDay: z.number().int().min(1).max(10_000).default(100),
});

export const UpdateListingSchema = CreateListingSchema.omit({ agentId: true }).partial();

export const ReviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const UseApiSchema = z.object({
  userInput:  z.string().min(1).max(16_000),
  overrides:  z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens:   z.number().int().min(1).max(128_000).optional(),
  }).optional(),
});

export const BrowseSchema = z.object({
  category:  z.string().optional(),
  search:    z.string().max(100).optional(),
  pricing:   z.nativeEnum(PricingModel).optional(),
  orderBy:   z.enum(["avgRating", "totalRunsCount", "subscribersCount", "createdAt"]).default("subscribersCount"),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(50).default(20),
});

// ---------------------------------------------------------------------------
// marketplaceService
// ---------------------------------------------------------------------------

export const marketplaceService = {

  // ── createListing ─────────────────────────────────────────────────────────

  async createListing(userId: string, input: z.infer<typeof CreateListingSchema>) {
    // Agent must belong to this creator
    const agent = await agentRepo.findById(input.agentId);
    if (!agent) throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    if (agent.userId !== userId) throw new AppError("You do not own this agent.", 403, "FORBIDDEN");

    // One listing per agent
    const existing = await listingRepo.findByAgentId(input.agentId);
    if (existing) throw new AppError("This agent already has a marketplace listing.", 409, "LISTING_EXISTS");

    const listing = await listingRepo.create({
      agent:         { connect: { id: input.agentId } },
      creator:       { connect: { id: userId } },
      name:          input.name,
      tagline:       input.tagline,
      description:   input.description,
      category:      input.category,
      tags:          input.tags,
      ...(input.iconUrl      ? { iconUrl:      input.iconUrl }      : {}),
      pricingModel:  input.pricingModel,
      ...(input.pricePerRun  !== undefined ? { pricePerRun:  input.pricePerRun }  : {}),
      ...(input.priceMonthly !== undefined ? { priceMonthly: input.priceMonthly } : {}),
      rateLimitPerDay: input.rateLimitPerDay,
    });

    logger.info("Listing created", { listingId: listing.id, agentId: input.agentId, userId });
    return listing;
  },

  // ── updateListing ─────────────────────────────────────────────────────────

  async updateListing(listingId: string, userId: string, input: z.infer<typeof UpdateListingSchema>) {
    const listing = await listingRepo.findById(listingId);
    if (!listing) throw new AppError("Listing not found.", 404, "LISTING_NOT_FOUND");
    if (listing.userId !== userId) throw new AppError("Access denied.", 403, "FORBIDDEN");

    return listingRepo.update(listingId, {
      ...(input.name           !== undefined ? { name:           input.name }           : {}),
      ...(input.tagline        !== undefined ? { tagline:        input.tagline }        : {}),
      ...(input.description    !== undefined ? { description:    input.description }    : {}),
      ...(input.category       !== undefined ? { category:       input.category }       : {}),
      ...(input.tags           !== undefined ? { tags:           input.tags }           : {}),
      ...(input.iconUrl        !== undefined ? { iconUrl:        input.iconUrl }        : {}),
      ...(input.pricingModel   !== undefined ? { pricingModel:   input.pricingModel }   : {}),
      ...(input.pricePerRun    !== undefined ? { pricePerRun:    input.pricePerRun }    : {}),
      ...(input.priceMonthly   !== undefined ? { priceMonthly:   input.priceMonthly }   : {}),
      ...(input.rateLimitPerDay !== undefined ? { rateLimitPerDay: input.rateLimitPerDay } : {}),
    });
  },

  // ── publish ───────────────────────────────────────────────────────────────

  async publish(listingId: string, userId: string) {
    const listing = await listingRepo.findById(listingId);
    if (!listing) throw new AppError("Listing not found.", 404, "LISTING_NOT_FOUND");
    if (listing.userId !== userId) throw new AppError("Access denied.", 403, "FORBIDDEN");
    if (listing.status === ListingStatus.PUBLISHED) {
      throw new AppError("Listing is already published.", 400, "ALREADY_PUBLISHED");
    }

    // Agent must be ACTIVE for listing to go live
    const agent = await agentRepo.findById(listing.agentId);
    if (!agent || agent.status !== "ACTIVE") {
      throw new AppError("Agent must be in ACTIVE status before listing can be published.", 400, "AGENT_NOT_ACTIVE");
    }

    return listingRepo.update(listingId, {
      status:      ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    });
  },

  // ── unpublish (deprecate) ─────────────────────────────────────────────────

  async unpublish(listingId: string, userId: string) {
    const listing = await listingRepo.findById(listingId);
    if (!listing) throw new AppError("Listing not found.", 404, "LISTING_NOT_FOUND");
    if (listing.userId !== userId) throw new AppError("Access denied.", 403, "FORBIDDEN");
    return listingRepo.update(listingId, { status: ListingStatus.DEPRECATED });
  },

  // ── browse ────────────────────────────────────────────────────────────────

  async browse(filters: z.infer<typeof BrowseSchema>) {
    const skip = (filters.page - 1) * filters.limit;
    return listingRepo.browse({
      category:  filters.category,
      search:    filters.search,
      pricing:   filters.pricing,
      orderBy:   filters.orderBy,
      take:      filters.limit,
      skip,
    });
  },

  // ── getListing ────────────────────────────────────────────────────────────

  async getListing(listingId: string) {
    const listing = await listingRepo.findById(listingId);
    if (!listing || listing.status === ListingStatus.SUSPENDED) {
      throw new AppError("Listing not found.", 404, "LISTING_NOT_FOUND");
    }
    return listing;
  },

  // ── myListings ────────────────────────────────────────────────────────────

  async myListings(userId: string) {
    return listingRepo.findByCreator(userId);
  },

  // ── subscribe ─────────────────────────────────────────────────────────────

  async subscribe(listingId: string, userId: string) {
    const listing = await listingRepo.findById(listingId);
    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new AppError("Listing not found or not published.", 404, "LISTING_NOT_FOUND");
    }

    // Cannot subscribe to own listing
    if (listing.userId === userId) {
      throw new AppError("You cannot subscribe to your own listing.", 400, "OWN_LISTING");
    }

    // Already subscribed?
    const existing = await subscriptionRepo.findUserSub(listingId, userId);
    if (existing) {
      if (existing.isActive) {
        throw new AppError("You are already subscribed to this listing.", 409, "ALREADY_SUBSCRIBED");
      }
      // Reactivate a cancelled subscription with a fresh API key
      const updated = await subscriptionRepo.update(existing.id, {
        isActive:      true,
        apiKey:        generateApiKey(),
        cancelledAt:   null,
        dailyRunsUsed: 0,
        dailyResetAt:  new Date(),
      });
      await billingService.recordListingSubscriptionCharge({
        listingId,
        subscriberId: userId,
      });
      return updated;
    }

    const apiKey = generateApiKey();
    const sub = await subscriptionRepo.create({
      listing: { connect: { id: listingId } },
      user:    { connect: { id: userId } },
      apiKey,
    });

    // Update subscriber count
    await listingRepo.update(listingId, { subscribersCount: { increment: 1 } });

    logger.info("Subscription created", { listingId, userId, subId: sub.id });

    await billingService.recordListingSubscriptionCharge({
      listingId,
      subscriberId: userId,
    });

    // Notify the listing creator (fire-and-forget)
    userRepo.findById(userId).then((subscriber) => {
      if (subscriber) {
        notificationService.notifySubscriptionNew(
          listing.userId,
          listing.name,
          listingId,
          subscriber.username,
        ).catch(() => {});
      }
    }).catch(() => {});

    return sub;
  },

  // ── unsubscribe ───────────────────────────────────────────────────────────

  async unsubscribe(listingId: string, userId: string) {
    const sub = await subscriptionRepo.findUserSub(listingId, userId);
    if (!sub || !sub.isActive) {
      throw new AppError("Subscription not found.", 404, "NOT_SUBSCRIBED");
    }

    await subscriptionRepo.update(sub.id, { isActive: false, cancelledAt: new Date() });
    await listingRepo.update(listingId, { subscribersCount: { decrement: 1 } });
  },

  // ── mySubscriptions ───────────────────────────────────────────────────────

  async mySubscriptions(userId: string) {
    return subscriptionRepo.findByUser(userId);
  },

  // ── useApi — execute agent via subscription API key ───────────────────────

  async useApi(apiKey: string, input: z.infer<typeof UseApiSchema>) {
    // Resolve subscription
    const sub = await subscriptionRepo.findByApiKey(apiKey);
    if (!sub || !sub.isActive) {
      throw new AppError("Invalid or inactive API key.", 401, "INVALID_API_KEY");
    }

    const listing = sub.listing as (typeof sub.listing & {
      agent: { id: string; name: string; model: string; prompt: string; config: unknown; tools: unknown };
      rateLimitPerDay: number;
    });

    if (listing.status !== ListingStatus.PUBLISHED) {
      throw new AppError("This listing is no longer available.", 404, "LISTING_UNAVAILABLE");
    }

    // Enforce daily rate limit — reset counter if needed
    const now = new Date();
    const resetDate = sub.dailyResetAt;
    const isNewDay  = now.toDateString() !== resetDate.toDateString();

    if (isNewDay) {
      await subscriptionRepo.update(sub.id, {
        dailyRunsUsed: 0,
        dailyResetAt:  now,
      });
      sub.dailyRunsUsed = 0;
    }

    if (sub.dailyRunsUsed >= listing.rateLimitPerDay) {
      throw new AppError(
        `Daily rate limit of ${listing.rateLimitPerDay} requests reached. Resets at midnight UTC.`,
        429,
        "RATE_LIMIT_EXCEEDED",
      );
    }

    // Execute
    const result = await RuntimeEngine.execute(sub.userId, {
      agentId:      listing.agent.id,
      userInput:    input.userInput,
      mode:         "quick", // default for marketplace API
      overrides:    input.overrides,
      triggerSource:"manual",
    });

    // Increment usage
    await Promise.all([
      subscriptionRepo.incrementUsage(sub.id),
      listingRepo.update(listing.id, { totalRunsCount: { increment: 1 } }),
    ]);

    logger.info("Marketplace API used", {
      listingId:   listing.id,
      subId:       sub.id,
      userId:      sub.userId,
      status:      result.status,
      durationMs:  result.durationMs,
    });

    return {
      status:     result.status,
      output:     result.output,
      error:      result.error,
      usage:      result.usage,
      model:      result.model,
      durationMs: result.durationMs,
      dailyUsage: {
        used:  sub.dailyRunsUsed + 1,
        limit: listing.rateLimitPerDay,
      },
    };
  },

  // ── submitReview ──────────────────────────────────────────────────────────

  async submitReview(listingId: string, userId: string, input: z.infer<typeof ReviewSchema>) {
    // Must have an active subscription to review
    const sub = await subscriptionRepo.findUserSub(listingId, userId);
    if (!sub || !sub.isActive) {
      throw new AppError("You must be a subscriber to leave a review.", 403, "NOT_SUBSCRIBED");
    }

    const review = await reviewRepo.upsert(listingId, userId, input.rating, input.comment);
    await listingRepo.updateRating(listingId);

    // Notify the listing creator (fire-and-forget)
    const [listing, reviewer] = await Promise.all([
      listingRepo.findById(listingId),
      userRepo.findById(userId),
    ]);
    if (listing && reviewer && listing.userId !== userId) {
      notificationService.notifyReviewReceived(
        listing.userId,
        listing.name,
        listingId,
        input.rating,
        reviewer.username,
      ).catch(() => {});
    }

    return review;
  },

  // ── deleteReview ──────────────────────────────────────────────────────────

  async deleteReview(listingId: string, userId: string) {
    const existing = await reviewRepo.findUserReview(listingId, userId);
    if (!existing) throw new AppError("Review not found.", 404, "REVIEW_NOT_FOUND");
    await reviewRepo.delete(listingId, userId);
    await listingRepo.updateRating(listingId);
  },

  // ── getReviews ────────────────────────────────────────────────────────────

  async getReviews(listingId: string, limit = 20) {
    return reviewRepo.findByListing(listingId, limit);
  },

  // ── explore — aggregated discovery data ────────────────────────────────────

  async explore(_userId?: string) {
    // 1. Trending (most subscribers or runs)
    const trendingRaw = await listingRepo.browse({
      orderBy: "subscribersCount",
      take:    10,
    });

    // 2. New Arrivals
    const newArrivalsRaw = await listingRepo.browse({
      orderBy: "createdAt",
      take:    6,
    });

    // 3. Curated (Top rated)
    const curatedRaw = await listingRepo.browse({
      orderBy: "avgRating",
      take:    6,
    });

    // 4. Best for You
    const bestForYouRaw = await listingRepo.browse({
      orderBy: "totalRunsCount",
      take:    6,
    });

    // 5. All
    const allRaw = await listingRepo.browse({
      orderBy: "subscribersCount",
      take:    24,
    });

    // 6. Featured Collections
    const collectionsRaw = await collectionRepo.findAll();

    // Map helpers
    const mapListing = (l: any) => ({
      id:             l.id,
      name:           l.name,
      description:    l.description,
      category:       l.category,
      tags:           l.tags,
      icon_url:       l.iconUrl,
      creator_name:   l.creator?.displayName || l.creator?.username || "Unknown",
      creator_id:     l.userId,
      is_public:      true,
      version:        l.agent?.version || "1.0.0",
      execution_type: l.agent?.type || "API",
      runs_count:     l.totalRunsCount,
      success_rate:   95, // mock for now
      rating:         l.avgRating,
      reviews_count:  l.reviewsCount,
      pricing:        l.pricingModel.toLowerCase(),
      pricing_label:  l.pricingModel === "FREE" ? "Free" : `$${l.pricePerRun}/run`,
      difficulty:     "beginner", // mock for now
      created_at:     l.createdAt.toISOString(),
      updated_at:     l.updatedAt.toISOString(),
      trending_score: (l.subscribersCount / 10) + 1, // mock
    });

    const mapCollection = (c: any) => ({
      id:          c.id,
      title:       c.name,
      description: c.description || "",
      cta:         "Explore Collection",
      gradient:    "from-violet-500/20 via-purple-500/10 to-blue-500/20",
      icon:        "Sparkles",
      agentIds:    c.items.map((i: any) => i.listingId),
    });

    return {
      trending:    trendingRaw.map(mapListing),
      newArrivals: newArrivalsRaw.map(mapListing),
      curated:     curatedRaw.map(mapListing),
      bestForYou:  bestForYouRaw.map(mapListing),
      all:         allRaw.map(mapListing),
      collections: collectionsRaw.map(mapCollection),
    };
  },

  // ── getCollections ─────────────────────────────────────────────────────────

  async getCollections() {
    return collectionRepo.findAll();
  },

  async getCollectionBySlug(slug: string) {
    const collection = await collectionRepo.findBySlug(slug);
    if (!collection) throw new AppError("Collection not found.", 404, "COLLECTION_NOT_FOUND");
    return collection;
  },
};
