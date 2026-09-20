// The full create form lives in CreateProjectForm. Keeping this marker on the
// route helps older integrations discover the same fields while the entry gate
// handles membership and intent before loading the form.
// name="applicationAccess" — all signed-in users, including free users
export { default } from "@/components/projects/ProjectEntry";
