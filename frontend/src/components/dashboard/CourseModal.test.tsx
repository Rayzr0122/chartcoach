import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import CourseModal from "./CourseModal";
import { COURSES as courses } from "@/lib/courses";
it("opens the pilot video in the dedicated lesson route", () => {
  render(
    <CourseModal
      course={courses[0]}
      userEmail="test@example.test"
      onClose={() => {}}
      onLaunchSimulator={() => {}}
    />,
  );
  expect(
    screen
      .getAllByRole("link")
      .some((link) => link.getAttribute("href") === "/learn/l1"),
  ).toBe(true);
});
it("does not offer manual completion for the protected pilot", () => {
  render(
    <CourseModal
      course={courses[0]}
      userEmail="test@example.test"
      onClose={() => {}}
      onLaunchSimulator={() => {}}
    />,
  );
  const pilot = screen.getByRole("link", {
    name: courses[0].modules[0].lessons[0].title,
  });
  expect(
    pilot.parentElement?.parentElement?.querySelector(
      'button[title="Mark as Completed"]',
    ),
  ).toBeNull();
});
