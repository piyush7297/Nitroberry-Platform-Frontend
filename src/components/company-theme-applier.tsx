"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import themeContract from "../../theme-variables.json";

type ThemeTokenMap = Record<string, string>;

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
};

const normalizeCssVarName = (key: string): string => {
    const trimmed = key.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("--")) return trimmed;
    return `--${trimmed.replace(/^[-]+/, "")}`;
};

const resolveExpectedThemeTokens = (): string[] => {
    const root = asRecord(themeContract);
    const tokenGroups = asRecord(root?.tokenGroups);
    const core = asRecord(tokenGroups?.core);
    const chat = asRecord(tokenGroups?.chat);

    const coreLight = asRecord(core?.light) ?? {};
    const chatLight = asRecord(chat?.light) ?? {};

    return Array.from(
        new Set([...Object.keys(coreLight), ...Object.keys(chatLight)]),
    );
};

const collectTokenValues = (
    source: unknown,
    expectedTokens: Set<string>,
    target: ThemeTokenMap,
) => {
    const record = asRecord(source);
    if (!record) return;

    Object.entries(record).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value === "string" || typeof value === "number") {
            const cssToken = normalizeCssVarName(key);
            if (!cssToken) return;

            const shouldApply =
                key.trim().startsWith("--") || expectedTokens.has(cssToken);

            if (shouldApply) {
                target[cssToken] = String(value);
            }
            return;
        }

        if (typeof value === "object" && !Array.isArray(value)) {
            collectTokenValues(value, expectedTokens, target);
        }
    });
};

const resolveThemeTokens = (
    companyUiPayload: unknown,
    expectedTokens: Set<string>,
    isDarkMode: boolean,
): ThemeTokenMap => {
    const companyUi = asRecord(companyUiPayload);
    const uiSettings = asRecord(companyUi?.uiSettings) ?? companyUi;
    if (!uiSettings) {
        return {};
    }

    const modeKey = isDarkMode ? "dark" : "light";
    const buckets: unknown[] = [uiSettings, uiSettings[modeKey]];

    const core = asRecord(uiSettings.core);
    if (core) {
        buckets.push(core);
        buckets.push(core[modeKey]);
    }

    const chat = asRecord(uiSettings.chat);
    if (chat) {
        buckets.push(chat);
        buckets.push(chat[modeKey]);
    }

    const tokens: ThemeTokenMap = {};
    buckets.forEach((bucket) => {
        collectTokenValues(bucket, expectedTokens, tokens);
    });

    return tokens;
};

const evaluateCoverage = (
    appliedTokens: ThemeTokenMap,
    expectedTokenList: string[],
) => {
    const appliedTokenKeys = Object.keys(appliedTokens);
    const expectedTokenSet = new Set(expectedTokenList);

    const matched = expectedTokenList.filter((token) =>
        appliedTokenKeys.includes(token),
    );
    const missing = expectedTokenList.filter(
        (token) => !appliedTokenKeys.includes(token),
    );
    const extra = appliedTokenKeys.filter((token) => !expectedTokenSet.has(token));

    return {
        matchedCount: matched.length,
        totalExpected: expectedTokenList.length,
        missing,
        extra,
    };
};

const applyThemeTokens = (tokens: ThemeTokenMap) => {
    const rootStyle = document.documentElement.style;
    Object.entries(tokens).forEach(([token, value]) => {
        rootStyle.setProperty(token, value);
    });
};

const logCoverage = (
    companyUiPayload: unknown,
    appliedTokens: ThemeTokenMap,
    expectedTokenList: string[],
    isDarkMode: boolean,
) => {
    const coverage = evaluateCoverage(appliedTokens, expectedTokenList);

    console.groupCollapsed(
        `[Theme] companyUi applied (${coverage.matchedCount}/${coverage.totalExpected} required tokens)`,
    );
    console.log("mode", isDarkMode ? "dark" : "light");
    console.log("companyUi", companyUiPayload);
    console.log("appliedTokenCount", Object.keys(appliedTokens).length);
    console.log("appliedTokens", appliedTokens);
    console.log("missingRequiredTokens", coverage.missing);
    console.log("extraTokens", coverage.extra);

    if (coverage.missing.length > 0) {
        console.warn(
            "[Theme] Incoming companyUi does not fully cover required UI tokens.",
        );
    } else {
        console.log("[Theme] Incoming companyUi fully covers required UI tokens.");
    }

    console.groupEnd();
};

export function CompanyThemeApplier() {
    const { data: session } = useSession();

    const expectedTokenList = useMemo(() => resolveExpectedThemeTokens(), []);
    const expectedTokenSet = useMemo(
        () => new Set(expectedTokenList),
        [expectedTokenList],
    );

    useEffect(() => {
        const user = session?.user as { companyUi?: unknown } | undefined;
        const companyUi = user?.companyUi;

        if (!companyUi) {
            return;
        }

        const applyFromCurrentMode = () => {
            const isDarkMode = document.documentElement.classList.contains("dark");
            const tokens = resolveThemeTokens(companyUi, expectedTokenSet, isDarkMode);

            if (Object.keys(tokens).length === 0) {
                console.warn(
                    "[Theme] companyUi found but no compatible uiSettings tokens were detected.",
                    companyUi,
                );
                return;
            }

            applyThemeTokens(tokens);
            logCoverage(companyUi, tokens, expectedTokenList, isDarkMode);
        };

        applyFromCurrentMode();

        const observer = new MutationObserver(() => {
            applyFromCurrentMode();
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => {
            observer.disconnect();
        };
    }, [session, expectedTokenList, expectedTokenSet]);

    return null;
}
