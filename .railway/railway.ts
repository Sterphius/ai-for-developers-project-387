import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const api = service("calendar-booking", {
    source: github("Sterphius/ai-for-developers-project-387"),
  });

  return project("calendar-booking", {
    resources: [api],
  });
});
