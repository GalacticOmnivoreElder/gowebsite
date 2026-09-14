import { learningCatalog } from '@/content/evergreen-curriculum.mjs';
export function GET() { return Response.json(learningCatalog); }
