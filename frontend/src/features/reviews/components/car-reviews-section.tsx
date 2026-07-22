"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/shared/utils/format";
import { useMe } from "@/features/auth/api";
import { useCarReviews, useUpdateReview, useDeleteReview } from "../api";
import type { ReviewItem } from "../api";
import { StarRating } from "./star-rating";

// ── Avatar initials helper ──────────────────────────────────────────────────

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ── Rating summary bar ──────────────────────────────────────────────────────

function RatingSummary({ avgRating, reviewCount }: { avgRating: number | null; reviewCount: number }) {
  const rating = avgRating ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      {reviewCount > 0 ? (
        <>
          <span
            style={{
              fontFamily: "var(--brc-font-display)",
              fontSize: 48,
              fontWeight: 900,
              color: "var(--brc-text)",
              lineHeight: 1,
            }}
          >
            {rating.toFixed(1)}
          </span>
          <div>
            <StarRating rating={rating} size={18} />
            <p style={{ fontSize: 13, color: "var(--brc-text-muted)", margin: "4px 0 0", fontFamily: "var(--brc-font-ui)" }}>
              out of 5.0 &middot; {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
            </p>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 14, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", margin: 0 }}>
          No ratings yet
        </p>
      )}
    </div>
  );
}

// ── Individual review card ──────────────────────────────────────────────────

function ReviewCard({
  review,
  isOwnReview,
  onEdit,
  onDelete,
  isDeleting,
}: {
  review: ReviewItem;
  isOwnReview: boolean;
  onEdit: (review: ReviewItem) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const fullName = `${review.reviewer.first_name} ${review.reviewer.last_name}`;
  const initials = getInitials(review.reviewer.first_name, review.reviewer.last_name);

  return (
    <article
      style={{
        padding: "20px 0",
        borderBottom: "1px solid var(--brc-border)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--brc-primary-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--brc-primary)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14, color: "var(--brc-text)", margin: 0 }}>
              {fullName}
            </p>
            <p style={{ fontSize: 12, color: "var(--brc-text-muted)", margin: 0, fontFamily: "var(--brc-font-ui)" }}>
              {formatRelativeDate(review.created_at)}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StarRating rating={review.rating} size={14} />
          {isOwnReview && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => onEdit(review)}
                style={{
                  background: "none",
                  border: "1px solid var(--brc-border)",
                  borderRadius: "var(--brc-radius-sm)",
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--brc-font-ui)",
                  color: "var(--brc-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(review.id)}
                disabled={isDeleting}
                style={{
                  background: "none",
                  border: "1px solid var(--brc-border)",
                  borderRadius: "var(--brc-radius-sm)",
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--brc-font-ui)",
                  color: "var(--brc-danger, #ef4444)",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 14, color: "var(--brc-text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "var(--brc-font-ui)" }}>
        {review.comment}
      </p>
    </article>
  );
}

// ── Inline edit form ────────────────────────────────────────────────────────

function EditReviewForm({
  review,
  onCancel,
  onSaved,
}: {
  review: ReviewItem;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment);
  const updateReview = useUpdateReview();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !comment.trim()) {
      toast.error("Please provide a rating and comment");
      return;
    }
    try {
      await updateReview.mutateAsync({ id: review.id, rating, comment: comment.trim() });
      toast.success("Review updated");
      onSaved();
    } catch {
      toast.error("Failed to update review");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-md)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "var(--brc-bg-subtle)",
      }}
    >
      <h4 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 700, fontSize: 15, color: "var(--brc-text)", margin: 0 }}>
        Edit Review
      </h4>

      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)", display: "block", marginBottom: 6 }}>
          Your Rating
        </span>
        <StarRating rating={rating} size={22} interactive onChange={setRating} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="edit-review-comment"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}
        >
          Your Comment
        </label>
        <textarea
          id="edit-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            borderRadius: "var(--brc-radius-sm)",
            border: "1px solid var(--brc-border)",
            padding: "10px 12px",
            fontSize: 14,
            fontFamily: "var(--brc-font-ui)",
            color: "var(--brc-text)",
            resize: "vertical",
            outline: "none",
            background: "#fff",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={updateReview.isPending}
          style={{
            height: 38,
            padding: "0 20px",
            borderRadius: "var(--brc-radius-sm)",
            border: "none",
            background: "var(--brc-primary)",
            color: "#fff",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: updateReview.isPending ? "not-allowed" : "pointer",
            opacity: updateReview.isPending ? 0.7 : 1,
          }}
        >
          {updateReview.isPending ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 38,
            padding: "0 20px",
            borderRadius: "var(--brc-radius-sm)",
            border: "1px solid var(--brc-border)",
            background: "#fff",
            color: "var(--brc-text-secondary)",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main section component ──────────────────────────────────────────────────

export function CarReviewsSection({ carId }: { carId: string }) {
  const { data, isLoading } = useCarReviews(carId);
  const { data: me } = useMe();
  const deleteReview = useDeleteReview();
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    try {
      await deleteReview.mutateAsync(pendingDeleteId);
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setPendingDeleteId(null);
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Skeleton className="h-16 w-48 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const reviews = data?.results ?? [];
  const avgRating = data?.avg_rating ?? null;
  const reviewCount = data?.review_count ?? 0;

  return (
    <div>
      {/* Rating summary */}
      <div style={{ marginBottom: 24 }}>
        <RatingSummary avgRating={avgRating} reviewCount={reviewCount} />
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div
          style={{
            padding: "40px 24px",
            border: "1px solid var(--brc-border)",
            borderRadius: "var(--brc-radius-md)",
            textAlign: "center",
            background: "var(--brc-bg-subtle)",
          }}
        >
          <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, color: "var(--brc-text-secondary)", margin: 0 }}>
            No reviews yet. Be the first to review!
          </p>
        </div>
      ) : (
        <div>
          {reviews.map((review) => (
            <div key={review.id}>
              {editingReview?.id === review.id ? (
                <div style={{ padding: "20px 0", borderBottom: "1px solid var(--brc-border)" }}>
                  <EditReviewForm
                    review={review}
                    onCancel={() => setEditingReview(null)}
                    onSaved={() => setEditingReview(null)}
                  />
                </div>
              ) : (
                <ReviewCard
                  review={review}
                  isOwnReview={!!me && me.id === review.reviewer.id}
                  onEdit={(r) => setEditingReview(r)}
                  onDelete={setPendingDeleteId}
                  isDeleting={deleteReview.isPending}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(next: boolean) => { if (!next) setPendingDeleteId(null); }}
        title="Delete this review?"
        description="Your rating and comment will be removed. This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={deleteReview.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
