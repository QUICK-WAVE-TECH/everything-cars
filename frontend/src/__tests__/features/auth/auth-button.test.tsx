import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthButton } from "@/features/auth/components/auth-button";

describe("AuthButton", () => {
  it("renders a navigable link when href is provided", () => {
    render(<AuthButton href="/sign-up">Continue as Customer</AuthButton>);

    const link = screen.getByRole("link", { name: /continue as customer/i });

    expect(link).toHaveAttribute("href", "/sign-up");
    expect(link).toHaveClass("rounded-lg");
  });

  it("keeps button click behavior when href is not provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<AuthButton onClick={onClick}>Continue</AuthButton>);
    const button = screen.getByRole("button", { name: /continue/i });

    expect(button).toHaveAttribute("data-slot", "button");
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
