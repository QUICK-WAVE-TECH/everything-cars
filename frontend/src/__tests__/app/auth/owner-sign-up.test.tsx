import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import OwnerSignUpPage from "@/app/(auth)/owner-sign-up/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("OwnerSignUpPage", () => {
  it("advances to owner details when Continue is clicked", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<OwnerSignUpPage />);

    await user.type(screen.getByPlaceholderText("First Name"), "Demo");
    await user.type(screen.getByPlaceholderText("Last Name"), "Owner");
    await user.type(screen.getByPlaceholderText("Email Address"), "owner@test.com");
    const passwordFields = screen.getAllByPlaceholderText("Password");
    await user.type(passwordFields[0], "securepass123");
    await user.type(passwordFields[1], "securepass123");
    await user.click(screen.getByRole("radio", { name: /private car/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("National ID")).toBeInTheDocument();
    expect(screen.getByText("Upload Car Ownership Document")).toBeInTheDocument();
    expect(screen.getByText("Bank Account Number")).toBeInTheDocument();
    expect(screen.getByText("Bank Name")).toBeInTheDocument();
  });

  it("keeps national id and bank account number digit-only", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<OwnerSignUpPage />);

    await user.type(screen.getByPlaceholderText("First Name"), "Demo");
    await user.type(screen.getByPlaceholderText("Last Name"), "Owner");
    await user.type(screen.getByPlaceholderText("Email Address"), "owner@test.com");
    const passwordFields = screen.getAllByPlaceholderText("Password");
    await user.type(passwordFields[0], "securepass123");
    await user.type(passwordFields[1], "securepass123");
    await user.click(screen.getByRole("radio", { name: /private car/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const nationalId = await screen.findByPlaceholderText("Enter your ID number");
    const bankAccount = screen.getByPlaceholderText("Enter bank account number");

    await user.type(nationalId, "12ab-34");
    await user.type(bankAccount, "00x12#34");

    expect(nationalId).toHaveValue("1234");
    expect(bankAccount).toHaveValue("001234");
  });
});
