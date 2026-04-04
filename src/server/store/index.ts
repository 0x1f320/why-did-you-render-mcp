export { RenderStore } from "./render-store.js"
export type {
  ComponentSummary,
  RenderWithProject,
  StoredRender,
} from "./types.js"

import { RenderStore } from "./render-store.js"

export const store = new RenderStore()
