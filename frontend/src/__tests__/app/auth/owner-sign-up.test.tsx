import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import OwnerSignUpPage from "@/app/(auth)/owner-sign-up/page";

describe("OwnerSignUpPage", () => {
  it("advances to owner details when Continue is clicked", async () => {
    const user = userEvent.setup();

    render(<OwnerSignUpPage />);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("National ID")).toBeInTheDocument();
    expect(screen.getByText("Upload Car Ownership Document")).toBeInTheDocument();
    expect(screen.getByText("Bank Account Number")).toBeInTheDocument();
    expect(screen.getByText("Bank Name")).toBeInTheDocument();
  });
});
