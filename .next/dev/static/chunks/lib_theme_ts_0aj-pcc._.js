(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/theme.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$createTheme$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__createTheme$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/styles/createTheme.mjs [app-client] (ecmascript) <export default as createTheme>");
'use client';
;
const theme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$createTheme$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__createTheme$3e$__["createTheme"])({
    palette: {
        primary: {
            main: '#2F5DE0',
            dark: '#2649B8',
            contrastText: '#FFFFFF'
        },
        secondary: {
            main: '#12B886',
            contrastText: '#FFFFFF'
        },
        warning: {
            main: '#E8A63A'
        },
        error: {
            main: '#E24C4C'
        },
        background: {
            default: '#F7F8FA',
            paper: '#FFFFFF'
        },
        text: {
            primary: '#14181F',
            secondary: '#8A93A3'
        },
        divider: '#E2E5EA'
    },
    typography: {
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        h1: {
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontWeight: 500
        },
        h2: {
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontWeight: 500
        },
        h3: {
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontWeight: 500
        },
        h4: {
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontWeight: 500
        },
        button: {
            textTransform: 'none',
            fontWeight: 500
        }
    },
    shape: {
        borderRadius: 8
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    paddingTop: 10,
                    paddingBottom: 10
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                size: 'small'
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                }
            }
        }
    }
});
const __TURBOPACK__default__export__ = theme;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=lib_theme_ts_0aj-pcc._.js.map