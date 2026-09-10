import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AppSidebar from "./AppSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

it("offers a player test entry point in the dashboard sidebar", () => {
  render(
    <AppSidebar
      user={{ id: "u1", email: "learner@example.com", full_name: "Learner", is_active: true, created_at: "2026-01-01", has_face_enrolled: false }}
      collapsed={false}
      onToggleCollapse={() => {}}
      onOpenSecurity={() => {}}
      onLogout={() => {}}
    />,
  );

  expect(screen.getByRole("link", { name: "Test player" })).toHaveAttribute("href", "/learn/l1?preview=1");
});
