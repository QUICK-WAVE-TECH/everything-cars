export type ReviewItem = {
  id: string;
  car: string;
  reviewer: { id: string; first_name: string; last_name: string };
  request: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type ReviewsResponse = {
  results: ReviewItem[];
  count: number;
  next: string | null;
  previous: string | null;
  avg_rating: number | null;
  review_count: number;
};

export type CreateReviewInput = {
  carId: string;
  request: string;
  rating: number;
  comment: string;
};

export type UpdateReviewInput = {
  id: string;
  rating: number;
  comment: string;
};
