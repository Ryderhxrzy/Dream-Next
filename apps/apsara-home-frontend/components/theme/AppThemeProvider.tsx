"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

type ThemeName = "light" | "dark"
type ThemeValue = ThemeName | "system"
type ThemeAttribute = "class" | `data-${string}`

type AppThemeContextValue = {
  themes: string[]
  theme?: string
  resolvedTheme?: string
  systemTheme?: ThemeName
  forcedTheme?: string
  setTheme: Dispatch<SetStateAction<string>>
}

type AppThemeProviderProps = {
  children: ReactNode
  attribute?: ThemeAttribute
  defaultTheme?: ThemeValue
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

const DEFAULT_THEMES: ThemeName[] = ["light", "dark"]
const THEME_STORAGE_KEY = "theme"
const AppThemeContext = createContext<AppThemeContextValue>({
  themes: DEFAULT_THEMES,
  theme: "light",
  resolvedTheme: "light",
  systemTheme: "light",
  setTheme: () => {},
})

function getSystemTheme(): ThemeName {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark"
  }

  return "light"
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    window.setTimeout(() => {
      style.remove()
    }, 1)
  }
}

function getInitialTheme(
  storageKey: string,
  defaultTheme: ThemeValue,
  enableSystem: boolean
): ThemeValue {
  if (typeof window === "undefined") return defaultTheme

  try {
    const savedTheme = window.localStorage.getItem(storageKey)
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme
    if (savedTheme === "system" && enableSystem) return "system"
  } catch {
    // Keep default theme when localStorage is unavailable.
  }

  return defaultTheme
}

export function AppThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = false,
  disableTransitionOnChange = false,
  storageKey = THEME_STORAGE_KEY,
}: AppThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeValue>(() =>
    getInitialTheme(storageKey, defaultTheme, enableSystem)
  )
  const [systemTheme, setSystemTheme] = useState<ThemeName>(() =>
    getSystemTheme()
  )
  const resolvedTheme =
    theme === "system" && enableSystem ? systemTheme : (theme as ThemeName)

  const applyTheme = useCallback(
    (nextTheme: ThemeName) => {
      const restoreTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : null
      const root = document.documentElement

      if (attribute === "class") {
        root.classList.remove(...DEFAULT_THEMES)
        root.classList.add(nextTheme)
      } else {
        root.setAttribute(attribute, nextTheme)
      }

      root.style.colorScheme = nextTheme
      restoreTransitions?.()
    },
    [attribute, disableTransitionOnChange]
  )

  const setTheme = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => {
      setThemeState((previous) => {
        const next =
          typeof value === "function" ? value(previous) : value || defaultTheme
        const normalized =
          next === "system" && enableSystem
            ? "system"
            : next === "dark"
              ? "dark"
              : "light"

        try {
          window.localStorage.setItem(storageKey, normalized)
        } catch {
          // Storage is best-effort only.
        }

        return normalized
      })
    },
    [defaultTheme, enableSystem, storageKey]
  )

  useEffect(() => {
    if (!enableSystem) return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => setSystemTheme(getSystemTheme())
    media.addEventListener("change", handleChange)

    return () => media.removeEventListener("change", handleChange)
  }, [enableSystem])

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [applyTheme, resolvedTheme])

  const contextValue = useMemo<AppThemeContextValue>(
    () => ({
      themes: enableSystem ? [...DEFAULT_THEMES, "system"] : DEFAULT_THEMES,
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme]
  )

  return (
    <AppThemeContext.Provider value={contextValue}>
      {children}
    </AppThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(AppThemeContext)
}
