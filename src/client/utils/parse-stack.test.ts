import { describe, expect, it } from "vitest"
import { parseStack } from "./parse-stack.js"

/** Create a fake Error with a given stack string. */
function fakeError(stack: string): Error {
  const err = new Error()
  err.stack = stack
  return err
}

// ---------------------------------------------------------------------------
// Fixtures — all synthetic, no real product code
// ---------------------------------------------------------------------------

const CHROME_HOOK_STACK = `Error
    at Object.notifier (index.js:200:12)
    at trackHookChanges (whyDidYouRender.js:1108:1)
    at useSyncExternalStoreWDYR (whyDidYouRender.js:1237:1)
    at useStore (useStore.mjs:42:18)
    at useFilter (useFilter.ts:23:10)
    at useSearchBar (useSearchBar.tsx:55:31)
    at SearchBar (SearchBar.tsx:18:5)
    at WDYRFunctionalComponent (whyDidYouRender.js:996:1)
    at React.createElement (whyDidYouRender.js:1288:1)
    at Header (Header.tsx:44:9)
    at Layout (Layout.tsx:31:7)
    at React.createElement (whyDidYouRender.js:1304:1)
    at react-router.js:447:221
    at Route.render (react-router.js:424:12)
    at AppRoutes (AppRoutes.tsx:62:11)
    at App (App.tsx:15:3)`

const CHROME_MIXED_STACK = `Error
    at Object.notifier (index.js:200:12)
    at trackHookChanges (whyDidYouRender.js:1108:1)
    at useSyncExternalStoreWDYR (whyDidYouRender.js:1237:1)
    at useBaseQuery (useBaseQuery.mjs:38:23)
    at useQuery (useQuery.mjs:7:22)
    at useProductList (useProductList.ts:12:20)
    at ProductGrid (ProductGrid.tsx:30:14)
    at WDYRFunctionalComponent (whyDidYouRender.js:996:1)
    at React.createElement (whyDidYouRender.js:1288:1)
    at catalog.tsx:85:9
    at mountMemo (react-dom-client.development.js:8777:1)
    at Object.useMemo (react-dom-client.development.js:26216:1)
    at __webpack_modules__.../../node_modules/react/cjs/react.development.js.exports.useMemo (react.development.js:1251:1)
    at useMemoWDYR (whyDidYouRender.js:1226:1)
    at CatalogPage (CatalogPage.tsx:44:7)
    at withAuth.tsx:28:9
    at Dashboard (Dashboard.tsx:112:5)
    at React.createElement (whyDidYouRender.js:1304:1)
    at react-router.js:682:14
    at Route.render (react-router.js:424:12)
    at Root (Root.tsx:20:3)`

const FIREFOX_STACK = `notifier@index.js:200:12
trackHookChanges@whyDidYouRender.js:1108:1
useSyncExternalStoreWDYR@whyDidYouRender.js:1237:1
useLocale@useLocale.ts:8:14
useFormatter@useFormatter.ts:15:22
DatePicker@DatePicker.tsx:33:5
FormField@FormField.tsx:19:7
render@SettingsPage.tsx:42:11`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseStack", () => {
  // === Chrome format: basic parsing ===

  describe("Chrome format", () => {
    it("extracts hook chain", () => {
      const hooks = parseStack(fakeError(CHROME_HOOK_STACK)).filter(
        (f) => f.type === "hook",
      )

      expect(hooks.map((h) => h.name)).toEqual([
        "useStore",
        "useFilter",
        "useSearchBar",
      ])
    })

    it("extracts component tree", () => {
      const components = parseStack(fakeError(CHROME_HOOK_STACK)).filter(
        (f) => f.type === "component",
      )

      expect(components.map((c) => c.name)).toEqual([
        "SearchBar",
        "Header",
        "Layout",
        "render",
        "AppRoutes",
        "App",
      ])
    })

    it("preserves location for hooks", () => {
      const hooks = parseStack(fakeError(CHROME_HOOK_STACK)).filter(
        (f) => f.type === "hook",
      )

      expect(hooks[0].location).toEqual({ path: "useStore.mjs", line: 42 })
      expect(hooks[1].location).toEqual({ path: "useFilter.ts", line: 23 })
      expect(hooks[2].location).toEqual({
        path: "useSearchBar.tsx",
        line: 55,
      })
    })

    it("preserves location for components", () => {
      const components = parseStack(fakeError(CHROME_MIXED_STACK)).filter(
        (f) => f.type === "component",
      )
      const grid = components.find((c) => c.name === "ProductGrid")
      const dash = components.find((c) => c.name === "Dashboard")

      expect(grid?.location).toEqual({ path: "ProductGrid.tsx", line: 30 })
      expect(dash?.location).toEqual({ path: "Dashboard.tsx", line: 112 })
    })

    it("parses named frame: at FnName (file:line:col)", () => {
      const frames = parseStack(
        fakeError(`Error
    at MyComponent (MyComponent.tsx:10:5)`),
      )

      expect(frames).toEqual([
        {
          type: "component",
          name: "MyComponent",
          location: { path: "MyComponent.tsx", line: 10 },
        },
      ])
    })

    it("skips anonymous frame: at file:line:col", () => {
      const frames = parseStack(
        fakeError(`Error
    at some-file.tsx:42:9`),
      )

      expect(frames).toEqual([])
    })

    it("parses Object.method frame and extracts method name", () => {
      const frames = parseStack(
        fakeError(`Error
    at Object.useTheme (useTheme.ts:5:12)`),
      )

      expect(frames).toEqual([
        {
          type: "hook",
          name: "useTheme",
          location: { path: "useTheme.ts", line: 5 },
        },
      ])
    })

    it("parses Class.method frame and extracts method name", () => {
      const frames = parseStack(
        fakeError(`Error
    at Sidebar.render (Sidebar.tsx:88:3)`),
      )

      expect(frames).toEqual([
        {
          type: "component",
          name: "render",
          location: { path: "Sidebar.tsx", line: 88 },
        },
      ])
    })

    it("parses new Constructor frame", () => {
      const frames = parseStack(
        fakeError(`Error
    at new ErrorBoundary (ErrorBoundary.tsx:12:5)`),
      )

      expect(frames).toEqual([
        {
          type: "component",
          name: "ErrorBoundary",
          location: { path: "ErrorBoundary.tsx", line: 12 },
        },
      ])
    })
  })

  // === Firefox/Safari format ===

  describe("Firefox format", () => {
    it("extracts hooks and components", () => {
      const frames = parseStack(fakeError(FIREFOX_STACK))
      const hooks = frames.filter((f) => f.type === "hook")
      const components = frames.filter((f) => f.type === "component")

      expect(hooks.map((h) => h.name)).toEqual(["useLocale", "useFormatter"])
      expect(components.map((c) => c.name)).toEqual([
        "DatePicker",
        "FormField",
        "render",
      ])
    })

    it("preserves location", () => {
      const frames = parseStack(fakeError(FIREFOX_STACK))
      const locale = frames.find((f) => f.name === "useLocale")

      expect(locale?.location).toEqual({ path: "useLocale.ts", line: 8 })
    })

    it("parses single Firefox frame", () => {
      const frames = parseStack(fakeError("useData@hooks.ts:3:10"))
      expect(frames).toEqual([
        {
          type: "hook",
          name: "useData",
          location: { path: "hooks.ts", line: 3 },
        },
      ])
    })
  })

  // === WDYR internal filtering ===

  describe("WDYR filtering", () => {
    it("filters notifier (Object.notifier)", () => {
      const names = parseStack(
        fakeError(`Error
    at Object.notifier (index.js:200:12)
    at Panel (Panel.tsx:10:3)`),
      ).map((f) => f.name)

      expect(names).not.toContain("notifier")
      expect(names).toContain("Panel")
    })

    it("filters trackHookChanges", () => {
      const frames = parseStack(
        fakeError(`Error
    at trackHookChanges (whyDidYouRender.js:1108:1)
    at useToggle (useToggle.ts:4:8)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("useToggle")
    })

    it("filters WDYRFunctionalComponent", () => {
      const names = parseStack(
        fakeError(`Error
    at WDYRFunctionalComponent (whyDidYouRender.js:996:1)
    at Wrapper (Wrapper.tsx:5:3)`),
      ).map((f) => f.name)

      expect(names).not.toContain("WDYRFunctionalComponent")
    })

    it("filters useSyncExternalStoreWDYR by file", () => {
      const frames = parseStack(
        fakeError(`Error
    at useSyncExternalStoreWDYR (whyDidYouRender.js:1237:1)
    at useAuth (useAuth.ts:9:5)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("useAuth")
    })

    it("filters useMemoWDYR by file", () => {
      const names = parseStack(
        fakeError(`Error
    at useMemoWDYR (whyDidYouRender.js:1226:1)
    at Page (Page.tsx:20:3)`),
      ).map((f) => f.name)

      expect(names).not.toContain("useMemo")
      expect(names).not.toContain("useMemoWDYR")
    })

    it("filters console.trace", () => {
      const names = parseStack(
        fakeError(`Error
    at console.trace (console.js:36:1)
    at Object.notifier (index.js:200:12)
    at Avatar (Avatar.tsx:8:3)`),
      ).map((f) => f.name)

      expect(names).not.toContain("trace")
      expect(names).toContain("Avatar")
    })

    it("filters all frames from whyDidYouRender.js regardless of name", () => {
      const frames = parseStack(
        fakeError(`Error
    at someRandomFn (whyDidYouRender.js:500:1)
    at anotherFn (whyDidYouRender.js:600:1)
    at RealComponent (RealComponent.tsx:10:3)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("RealComponent")
    })
  })

  // === React/library internal filtering ===

  describe("React internal filtering", () => {
    it("filters react-dom frames", () => {
      const frames = parseStack(
        fakeError(`Error
    at mountMemo (react-dom-client.development.js:8777:1)
    at renderWithHooks (react-dom-client.development.js:7632:1)
    at TodoItem (TodoItem.tsx:15:7)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("TodoItem")
    })

    it("filters react.development.js frames", () => {
      const frames = parseStack(
        fakeError(`Error
    at Object.useState (react.development.js:1497:1)
    at Counter (Counter.tsx:5:3)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("Counter")
    })

    it("filters react.production.min.js frames", () => {
      const frames = parseStack(
        fakeError(`Error
    at t.useState (react.production.min.js:20:1)
    at Widget (Widget.tsx:8:3)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("Widget")
    })

    it("filters scheduler frames", () => {
      const frames = parseStack(
        fakeError(`Error
    at performWork (scheduler.development.js:400:1)
    at flushWork (scheduler.development.js:150:1)
    at Badge (Badge.tsx:12:5)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("Badge")
    })

    it("filters installHook frames", () => {
      const frames = parseStack(
        fakeError(`Error
    at emit (installHook.js:1:1)
    at Card (Card.tsx:20:3)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("Card")
    })

    it("filters webpack-wrapped react module names", () => {
      const frames = parseStack(
        fakeError(`Error
    at __webpack_modules__.../../node_modules/react/cjs/react.development.js.exports.useMemo (react.development.js:1251:1)
    at Gallery (Gallery.tsx:44:5)`),
      )

      expect(frames).toHaveLength(1)
      expect(frames[0].name).toBe("Gallery")
    })
  })

  // === WDYR suffix stripping ===

  describe("WDYR suffix stripping", () => {
    it("strips WDYR suffix from hook in non-ignored file", () => {
      const frames = parseStack(
        fakeError(`Error
    at useCustomHookWDYR (my-hooks.ts:10:5)`),
      )

      expect(frames[0].name).toBe("useCustomHook")
      expect(frames[0].type).toBe("hook")
    })

    it("strips WDYR suffix from component name in non-ignored file", () => {
      const frames = parseStack(
        fakeError(`Error
    at SomeComponentWDYR (components.ts:20:3)`),
      )

      expect(frames[0].name).toBe("SomeComponent")
      expect(frames[0].type).toBe("component")
    })

    it("does not strip partial WDYR match", () => {
      const frames = parseStack(
        fakeError(`Error
    at useWDYRConfig (config.ts:5:3)`),
      )

      expect(frames[0].name).toBe("useWDYRConfig")
    })
  })

  // === Name cleaning (dot stripping) ===

  describe("name cleaning", () => {
    it("extracts method from Object.method", () => {
      const frames = parseStack(
        fakeError(`Error
    at Object.useSession (useSession.ts:10:3)`),
      )

      expect(frames[0].name).toBe("useSession")
    })

    it("extracts method from Array.forEach-like names", () => {
      const frames = parseStack(
        fakeError(`Error
    at Array.map (utils.ts:5:3)`),
      )

      expect(frames[0].name).toBe("map")
    })

    it("extracts method from deeply dotted name", () => {
      const frames = parseStack(
        fakeError(`Error
    at Foo.Bar.baz (module.ts:1:1)`),
      )

      expect(frames[0].name).toBe("baz")
    })
  })

  // === Hook classification ===

  describe("hook classification", () => {
    it("classifies use* as hook", () => {
      const frames = parseStack(
        fakeError(`Error
    at useAuth (useAuth.ts:3:5)
    at useLocalStorage (useLocalStorage.ts:10:8)
    at useDebounce (useDebounce.ts:7:3)`),
      )

      expect(frames.every((f) => f.type === "hook")).toBe(true)
    })

    it("classifies PascalCase names as component", () => {
      const frames = parseStack(
        fakeError(`Error
    at Sidebar (Sidebar.tsx:10:3)
    at MainLayout (MainLayout.tsx:5:7)
    at AppShell (AppShell.tsx:20:3)`),
      )

      expect(frames.every((f) => f.type === "component")).toBe(true)
    })

    it("classifies camelCase (non-use) as component", () => {
      const frames = parseStack(
        fakeError(`Error
    at render (App.tsx:42:11)
    at callback (handler.ts:8:3)`),
      )

      expect(frames.every((f) => f.type === "component")).toBe(true)
    })

    it("does not treat 'user' or 'used' as hook", () => {
      const frames = parseStack(
        fakeError(`Error
    at user (user.ts:1:1)
    at used (used.ts:1:1)
    at useful (useful.ts:1:1)`),
      )

      expect(frames.every((f) => f.type === "component")).toBe(true)
    })

    it("treats useMemo-style names as hook when not in ignored file", () => {
      const frames = parseStack(
        fakeError(`Error
    at Object.useMemo (custom-hooks.ts:5:3)`),
      )

      expect(frames[0].type).toBe("hook")
      expect(frames[0].name).toBe("useMemo")
    })
  })

  // === Edge cases ===

  describe("edge cases", () => {
    it("returns empty array for error with no stack", () => {
      const err = new Error()
      err.stack = undefined
      expect(parseStack(err)).toEqual([])
    })

    it("returns empty array for error with empty stack", () => {
      expect(parseStack(fakeError(""))).toEqual([])
    })

    it("returns empty array for Error-only stack", () => {
      expect(parseStack(fakeError("Error"))).toEqual([])
    })

    it("returns empty array when all frames are filtered", () => {
      const frames = parseStack(
        fakeError(`Error
    at Object.notifier (index.js:200:12)
    at trackHookChanges (whyDidYouRender.js:1108:1)
    at useSyncExternalStoreWDYR (whyDidYouRender.js:1237:1)
    at mountMemo (react-dom-client.development.js:8777:1)`),
      )

      expect(frames).toEqual([])
    })

    it("handles stack with only hooks (no component frames)", () => {
      const frames = parseStack(
        fakeError(`Error
    at useAlpha (useAlpha.ts:1:1)
    at useBeta (useBeta.ts:2:1)
    at useGamma (useGamma.ts:3:1)`),
      )

      expect(frames).toHaveLength(3)
      expect(frames.every((f) => f.type === "hook")).toBe(true)
    })

    it("handles stack with only components (no hook frames)", () => {
      const frames = parseStack(
        fakeError(`Error
    at Toolbar (Toolbar.tsx:10:3)
    at Panel (Panel.tsx:20:5)
    at App (App.tsx:30:7)`),
      )

      expect(frames).toHaveLength(3)
      expect(frames.every((f) => f.type === "component")).toBe(true)
    })

    it("handles single frame stack", () => {
      const frames = parseStack(
        fakeError(`Error
    at useOnce (useOnce.ts:1:1)`),
      )

      expect(frames).toEqual([
        {
          type: "hook",
          name: "useOnce",
          location: { path: "useOnce.ts", line: 1 },
        },
      ])
    })

    it("skips non-parseable lines gracefully", () => {
      const frames = parseStack(
        fakeError(`Error
    some garbage text
    at useValid (useValid.ts:5:3)
    ~~~more garbage~~~
    at Footer (Footer.tsx:10:3)`),
      )

      expect(frames).toHaveLength(2)
      expect(frames[0].name).toBe("useValid")
      expect(frames[1].name).toBe("Footer")
    })

    it("handles deeply nested hook chains (5+ hooks)", () => {
      const frames = parseStack(
        fakeError(`Error
    at useA (a.ts:1:1)
    at useB (b.ts:2:1)
    at useC (c.ts:3:1)
    at useD (d.ts:4:1)
    at useE (e.ts:5:1)
    at useF (f.ts:6:1)
    at DeepComponent (DeepComponent.tsx:10:3)`),
      )

      const hooks = frames.filter((f) => f.type === "hook")
      expect(hooks).toHaveLength(6)
      expect(hooks.map((h) => h.name)).toEqual([
        "useA",
        "useB",
        "useC",
        "useD",
        "useE",
        "useF",
      ])
    })

    it("handles full http:// URLs in file paths (Chrome)", () => {
      const frames = parseStack(
        fakeError(`Error
    at useCart (http://localhost:3000/static/js/bundle.js:4521:18)
    at ShopPage (http://localhost:3000/static/js/bundle.js:8823:5)`),
      )

      expect(frames[0].name).toBe("useCart")
      expect(frames[0].location.line).toBe(4521)
      expect(frames[1].name).toBe("ShopPage")
    })

    it("handles full http:// URLs in Firefox format", () => {
      const frames = parseStack(
        fakeError(
          "useTheme@http://localhost:5173/src/hooks/useTheme.ts:8:14\nNavbar@http://localhost:5173/src/components/Navbar.tsx:22:5",
        ),
      )

      expect(frames[0].name).toBe("useTheme")
      expect(frames[0].location.line).toBe(8)
      expect(frames[1].name).toBe("Navbar")
    })
  })

  // === Integration: mixed stack ===

  describe("mixed stack with all noise types", () => {
    it("correctly filters and classifies a realistic mixed stack", () => {
      const frames = parseStack(fakeError(CHROME_MIXED_STACK))
      const hooks = frames.filter((f) => f.type === "hook")
      const components = frames.filter((f) => f.type === "component")

      expect(hooks.map((h) => h.name)).toEqual([
        "useBaseQuery",
        "useQuery",
        "useProductList",
      ])

      expect(components.map((c) => c.name)).toEqual([
        "ProductGrid",
        "CatalogPage",
        "Dashboard",
        "render",
        "Root",
      ])
    })

    it("total frame count excludes all filtered noise", () => {
      const frames = parseStack(fakeError(CHROME_MIXED_STACK))
      expect(frames).toHaveLength(8)
    })
  })
})
