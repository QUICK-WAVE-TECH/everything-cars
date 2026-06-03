import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FAQSection } from "@/features/website/sections/faq-section";

describe("FAQSection", () => {
  it("opens an FAQ answer when its trigger is clicked", async () => {
    const user = userEvent.setup();

    render(<FAQSection />);

    const trigger = screen.getByRole("button", {
      name: /how do i rent a car on buy & rent cars/i,
    });

    await user.click(trigger);

    expect(
      screen.getByText(/search by city and car type/i),
    ).toBeVisible();
  });
});
