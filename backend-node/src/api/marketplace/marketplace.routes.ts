import { Router } from "express";
import {
  browse,
  getListing,
  myListings,
  createListing,
  updateListing,
  publishListing,
  unpublishListing,
  mySubscriptions,
  subscribe,
  unsubscribe,
  useApi,
  getReviews,
  submitReview,
  deleteReview,
} from "./marketplace.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

// ── Public routes (no auth required) ─────────────────────────────────────────

/**
 * @route   GET /api/marketplace/browse
 * @desc    Browse published listings with filters
 * @access  Public
 * @query   category, search, pricing, orderBy, page, limit
 */
router.get("/browse", browse);

// ── API key execution (X-API-Key header, no JWT) ──────────────────────────────

/**
 * @route   POST /api/marketplace/use
 * @desc    Execute an agent via marketplace API key
 * @access  API-Key (X-API-Key header)
 * @body    { userInput, overrides? }
 */
router.post("/use", useApi);

// ── Authenticated routes ──────────────────────────────────────────────────────

// Fixed paths must come before /:id to prevent Express param collision
router.use(verifyUser);

/**
 * @route   GET /api/marketplace/my-listings
 * @desc    List all listings created by the current user
 * @access  Private
 */
router.get("/my-listings", myListings);

/**
 * @route   GET /api/marketplace/my-subscriptions
 * @desc    List all active subscriptions for the current user
 * @access  Private
 */
router.get("/my-subscriptions", mySubscriptions);

/**
 * @route   POST /api/marketplace
 * @desc    Create a new marketplace listing (one per agent)
 * @access  Private
 * @body    { agentId, name, tagline?, description?, category?, tags?, pricingModel?, rateLimitPerDay? }
 */
router.post("/", createListing);

// ── Listing detail routes (/:id) ──────────────────────────────────────────────

/**
 * @route   GET /api/marketplace/:id
 * @desc    Get a single listing's public details
 * @access  Private
 */
router.get("/:id", getListing);

/**
 * @route   PATCH /api/marketplace/:id
 * @desc    Update listing metadata (creator only)
 * @access  Private (creator)
 * @body    Partial CreateListingSchema (without agentId)
 */
router.patch("/:id", updateListing);

/**
 * @route   POST /api/marketplace/:id/publish
 * @desc    Publish a DRAFT listing (agent must be ACTIVE)
 * @access  Private (creator)
 */
router.post("/:id/publish", publishListing);

/**
 * @route   POST /api/marketplace/:id/unpublish
 * @desc    Deprecate a published listing
 * @access  Private (creator)
 */
router.post("/:id/unpublish", unpublishListing);

/**
 * @route   POST /api/marketplace/:id/subscribe
 * @desc    Subscribe to a listing (receive API key)
 * @access  Private (cannot subscribe to own listing)
 */
router.post("/:id/subscribe", subscribe);

/**
 * @route   DELETE /api/marketplace/:id/subscribe
 * @desc    Cancel subscription
 * @access  Private
 */
router.delete("/:id/subscribe", unsubscribe);

/**
 * @route   GET /api/marketplace/:id/reviews
 * @desc    Get reviews for a listing
 * @access  Private
 * @query   limit (default 20, max 50)
 */
router.get("/:id/reviews", getReviews);

/**
 * @route   POST /api/marketplace/:id/reviews
 * @desc    Submit or update a review (active subscribers only)
 * @access  Private
 * @body    { rating: 1-5, comment? }
 */
router.post("/:id/reviews", submitReview);

/**
 * @route   DELETE /api/marketplace/:id/reviews
 * @desc    Delete own review
 * @access  Private
 */
router.delete("/:id/reviews", deleteReview);

export default router;
