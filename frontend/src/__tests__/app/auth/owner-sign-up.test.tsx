import { fireEvent, render, screen } from "@testing-library/react";
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

function getPasswordFields() {
  const [password, confirmPassword] = screen.getAllByPlaceholderText("Password");

  if (!password || !confirmPassword) {
    throw new Error("Expected password and confirm password fields to render");
  }

  return { password, confirmPassword };
}

function fillStepOne() {
  fireEvent.change(screen.getByPlaceholderText("First Name"), {
    target: { value: "Demo" },
  });
  fireEvent.change(screen.getByPlaceholderText("Last Name"), {
    target: { value: "Owner" },
  });
  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "owner@test.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your phone number"), {
    target: { value: "8012345678" },
  });

  const { password, confirmPassword } = getPasswordFields();
  fireEvent.change(password, { target: { value: "securepass123" } });
  fireEvent.change(confirmPassword, { target: { value: "securepass123" } });

  fireEvent.click(screen.getByRole("radio", { name: /private car/i }));
}

describe("OwnerSignUpPage", () => {
  it("advances to owner details when Continue is clicked", async () => {
    renderWithQueryClient(<OwnerSignUpPage />);

    fillStepOne();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("National ID")).toBeInTheDocument();
    expect(screen.getByText("Upload Car Ownership Document")).toBeInTheDocument();
    expect(screen.getByText("Bank Account Number")).toBeInTheDocument();
    expect(screen.getByText("Bank Name")).toBeInTheDocument();
  });

  it("keeps national id and bank account number digit-only", async () => {
    renderWithQueryClient(<OwnerSignUpPage />);

    fillStepOne();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const nationalId = await screen.findByPlaceholderText("Enter your ID number");
    const bankAccount = screen.getByPlaceholderText("Enter bank account number");

    fireEvent.change(nationalId, { target: { value: "12ab-34" } });
    fireEvent.change(bankAccount, { target: { value: "00x12#34" } });

    expect(nationalId).toHaveValue("1234");
    expect(bankAccount).toHaveValue("001234");
  });
});
