import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/shared/providers/query-provider";

function TestChild() {
  const queryClient = useQueryClient();
  return <div>has-client: {queryClient ? "yes" : "no"}</div>;
}

describe("QueryProvider", () => {
  it("provides a QueryClient to children", () => {
    render(
      <QueryProvider>
        <TestChild />
      </QueryProvider>,
    );

    expect(screen.getByText("has-client: yes")).toBeDefined();
  });
});
