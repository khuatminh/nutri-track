export type ThemePref = "system" | "light" | "dark";
export const THEME_COOKIE = "nt_theme";

/** Inline script run before hydration so the right theme is set with no flash (ADR §2.3). */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);var p=m?m[1]:'system';var e=document.documentElement;if(p==='system'){e.removeAttribute('data-theme');}else{e.setAttribute('data-theme',p);}}catch(_){}})();`;
