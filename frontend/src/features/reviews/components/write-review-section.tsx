"use client";

import { useState } from "react";
import { toast } from "sonner";

import { confirmToast } from "@/lib/confirm-toast";
import { useCarReviews, useCreateReview } from "../api";
import type { ReviewItem } from "../api";
import { StarRating } from "./star-rating";
import { useUpdateReview, useDeleteReview } from "../api";
import { useMe } from "@/features/auth/api";
import { formatRelativeDate } from "@/shared/utils/format";

type WriteReviewSectionProps = {
  carId: string;
  requestId: string;
};

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ── Displayed existing review with edit/delete ──────────────────────────────

function ExistingReview({
  review,
  onEditRequest,
  onDelete,
  isDeleting,
}: {
  review: ReviewItem;
  onEditRequest: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const initials = getInitials(review.reviewer.first_name, review.reviewer.last_name);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            {review.reviewer.first_name} {review.reviewer.last_name}
          </p>
          <p style={{ fontSize: 12, color: "var(--brc-text-muted)", margin: 0, fontFamily: "var(--brc-font-ui)" }}>
            {formatRelativeDate(review.created_at)}
          </p>
        </div>
      </div>

      <StarRating rating={review.rating} size={16} />

      <p style={{ fontSize: 14, color: "var(--brc-text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "var(--brc-font-ui)" }}>
        {review.comment}
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onEditRequest}
          style={{
            height: 36,
            padding: "0 18px",
            borderRadius: "var(--brc-radius-sm)",
            border: "1px solid var(--brc-border)",
            background: "#fff",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 13,
            color: "var(--brc-text-secondary)",
            cursor: "pointer",
          }}
        >
          Edit Review
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          style={{
            height: 36,
            padding: "0 18px",
            borderRadius: "var(--brc-radius-sm)",
            border: "1px solid var(--brc-border)",
            background: "#fff",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 13,
            color: "var(--brc-danger, #ef4444)",
            cursor: isDeleting ? "not-allowed" : "pointer",
            opacity: isDeleting ? 0.6 : 1,
          }}
        >
          {isDeleting ? "Deleting..." : "Delete Review"}
        </button>
      </div>
    </div>
  );
}

// ── Create / Edit form ──────────────────────────────────────────────────────

function ReviewForm({
  carId,
  requestId,
  existingReview,
  onDone,
}: {
  carId: string;
  requestId: string;
  existingReview: ReviewItem | null;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const isEditing = !!existingReview;
  const isPending = createReview.isPending || updateReview.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    try {
      if (isEditing && existingReview) {
        await updateReview.mutateAsync({ id: existingReview.id, rating, comment: comment.trim() });
        toast.success("Review updated");
      } else {
        await createReview.mutateAsync({ carId, request: requestId, rating, comment: comment.trim() });
        toast.success("Review submitted");
      }
      onDone();
    } catch {
      toast.error(isEditing ? "Failed to update review" : "Failed to submit review");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--brc-text-secondary)",
            fontFamily: "var(--brc-font-ui)",
            marginBottom: 8,
          }}
        >
          Your Rating
        </span>
        <StarRating rating={rating} size={28} interactive onChange={setRating} />
        {!rating && (
          <span style={{ fontSize: 12, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", display: "block", marginTop: 4 }}>
            Tap a star to rate
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor={`review-comment-${requestId}`}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}
        >
          Your Experience
        </label>
        <textarea
          id={`review-comment-${requestId}`}
          placeholder="Share your experience with this car and owner..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
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
            background: "transparent",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            height: 40,
            padding: "0 22px",
            borderRadius: "var(--brc-radius-sm)",
            border: "none",
            background: "var(--brc-primary)",
            color: "#fff",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Submitting..." : isEditing ? "Save Changes" : "Submit Review"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onDone}
            style={{
              height: 40,
              padding: "0 22px",
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
        )}
      </div>
    </form>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function WriteReviewSection({ carId, requestId }: WriteReviewSectionProps) {
  const { data: me } = useMe();
  const { data: reviewsData, isLoading } = useCarReviews(carId);
  const deleteReview = useDeleteReview();
  const [isEditing, setIsEditing] = useState(false);

  // Find if the current user already has a review linked to this request
  const myReview = reviewsData?.results.find(
    (r) => r.request === requestId && r.reviewer.id === me?.id,
  ) ?? null;

  function handleDelete() {
    if (!myReview) return;
    const reviewId = myReview.id;
    confirmToast({
      message: "Delete your review?",
      description: "This can't be undone.",
      actionLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteReview.mutateAsync(reviewId);
          toast.success("Review deleted");
        } catch {
          toast.error("Failed to delete review");
        }
      },
    });
  }

  return (
    <section className="overflow-hidden rounded-[var(--brc-radius-lg)] border border-(--brc-border) bg-white">
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--brc-border)" }}>
        <h3
          style={{
            fontFamily: "var(--brc-font-display)",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--brc-text)",
            margin: 0,
          }}
        >
          {myReview && !isEditing ? "Your Review" : isEditing ? "Edit Your Review" : "Write a Review"}
        </h3>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", margin: "4px 0 0" }}>
          {myReview && !isEditing ? "You reviewed this car." : "Share your experience to help other drivers."}
        </p>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 16, borderRadius: 8, background: "var(--brc-bg-muted)", width: "40%" }} />
            <div style={{ height: 12, borderRadius: 8, background: "var(--brc-bg-muted)", width: "80%" }} />
            <div style={{ height: 12, borderRadius: 8, background: "var(--brc-bg-muted)", width: "60%" }} />
          </div>
        ) : myReview && !isEditing ? (
          <ExistingReview
            review={myReview}
            onEditRequest={() => setIsEditing(true)}
            onDelete={handleDelete}
            isDeleting={deleteReview.isPending}
          />
        ) : (
          <ReviewForm
            carId={carId}
            requestId={requestId}
            existingReview={isEditing ? myReview : null}
            onDone={() => setIsEditing(false)}
          />
        )}
      </div>
    </section>
  );
}
