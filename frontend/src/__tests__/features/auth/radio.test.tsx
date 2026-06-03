import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Radio } from "@/features/auth/components/radio";

function OwnershipOptions() {
  const [ownerType, setOwnerType] = useState<"private" | "company" | null>(null);

  return (
    <>
      <Radio
        checked={ownerType === "private"}
        label="Private Car"
        name="owner-type"
        value="private"
        onChange={() => setOwnerType("private")}
      />
      <Radio
        checked={ownerType === "company"}
        label="Company"
        name="owner-type"
        value="company"
        onChange={() => setOwnerType("company")}
      />
    </>
  );
}

describe("Radio", () => {
  it("marks the selected ownership option", async () => {
    const user = userEvent.setup();

    render(<OwnershipOptions />);

    const privateCar = screen.getByRole("radio", { name: /private car/i });
    const company = screen.getByRole("radio", { name: /company/i });

    await user.click(privateCar);
    expect(privateCar).toBeChecked();
    expect(company).not.toBeChecked();

    await user.click(company);
    expect(company).toBeChecked();
    expect(privateCar).not.toBeChecked();
  });
});
