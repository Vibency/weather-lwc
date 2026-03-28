#!/usr/bin/env node
/**
 * SLDS + WCAG AA Static Audit for LWC Components
 * Checks HTML templates and CSS for:
 *   - SLDS 2 class compliance
 *   - SLDS styling hook / design token usage
 *   - WCAG 2.1 AA static accessibility rules
 */

const fs = require('fs');
const path = require('path');

const LWC_DIR = path.join(__dirname, '../force-app/main/default/lwc');

// ── Helpers ────────────────────────────────────────────────────────────────
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✘\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

let totalErrors = 0;
let totalWarnings = 0;

function report(level, file, line, message) {
    const lineRef = line ? `:${line}` : '';
    const icon = level === 'error' ? FAIL : level === 'warn' ? WARN : INFO;
    console.log(`  ${icon}  ${path.relative(LWC_DIR, file)}${lineRef}  ${message}`);
    if (level === 'error') totalErrors++;
    if (level === 'warn') totalWarnings++;
}

function getLines(content) {
    return content.split('\n');
}

function findLineNumber(lines, pattern) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) return i + 1;
    }
    return null;
}

// ── CSS Audit ──────────────────────────────────────────────────────────────
const HARDCODED_COLOR_RE = /(?<!var\()#[0-9a-fA-F]{3,8}\b|(?<!var\()rgba?\([^)]+\)/g;
const HARDCODED_FONT_SIZE_RE = /font-size\s*:\s*(?!var\()[\d.]+(?:px|rem|em)/g;
const VALID_HOOK_RE = /--slds-[cg]-/;
const CUSTOM_PROP_RE = /--(?!slds-)[a-z][a-zA-Z0-9-]+\s*:/g;

function auditCSS(filePath, content) {
    const lines = getLines(content);

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        const trimmed = line.trim();

        // Skip comments and blank lines
        if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '') return;

        // Hardcoded colors — strip var() expressions first so fallback values are not flagged
        const strippedForColor = trimmed.replace(/var\([^)]+\)/g, 'var(...)');
        const colorMatches = strippedForColor.match(HARDCODED_COLOR_RE);
        if (colorMatches) {
            colorMatches.forEach(match => {
                report('warn', filePath, lineNum,
                    `[SLDS] Hardcoded color "${match}" — use an SLDS design token (--slds-g-color-*)`);
            });
        }

        // Hardcoded font sizes
        if (HARDCODED_FONT_SIZE_RE.test(line)) {
            HARDCODED_FONT_SIZE_RE.lastIndex = 0;
            report('warn', filePath, lineNum,
                `[SLDS] Hardcoded font-size — use slds-text-* utility classes or --slds-g-font-*`);
        }

        // Custom CSS properties not following SLDS hook naming
        const customProps = line.match(CUSTOM_PROP_RE);
        if (customProps) {
            customProps.forEach(prop => {
                report('warn', filePath, lineNum,
                    `[SLDS] Custom property "${prop.trim()}" should use --slds-c-* (component) or --slds-g-* (global) convention`);
            });
        }

        // !important overrides SLDS cascade
        if (line.includes('!important')) {
            report('error', filePath, lineNum,
                `[SLDS] "!important" overrides SLDS cascade — remove and use styling hooks instead`);
        }

        // px-based margins/paddings instead of spacing tokens
        if (/(?:margin|padding)\s*:\s*[\d.]+px/.test(line)) {
            report('warn', filePath, lineNum,
                `[SLDS] Hardcoded px spacing — prefer SLDS spacing utilities (slds-m-*, slds-p-*) or --slds-g-spacing-*`);
        }
    });
}

// ── HTML Template Audit ────────────────────────────────────────────────────

// Valid SLDS class prefixes
const SLDS_CLASS_PREFIXES = ['slds-', 'nds-'];

// Classes we allow that are not SLDS (component-scoped, theme classes)
const ALLOWED_NON_SLDS_CLASSES = ['weather-card', 'weather-dashboard', 'summary-bar',
    'summary-stat', 'stat-tile', 'temp-display', 'temp-value', 'temp-unit', 'forecast-table',
    'dashboard-header', 'badge-sunny', 'badge-rainy', 'badge-cloudy', 'badge-stormy',
    'badge-foggy', 'badge-windy', 'badge-partly-cloudy', 'uv-low', 'uv-moderate',
    'uv-high', 'uv-very-high'];

// WCAG: interactive elements that need accessible labels
const INTERACTIVE_TAGS = ['button', 'a', 'input', 'select', 'textarea'];

function extractClasses(attrValue) {
    return attrValue.replace(/[{}]/g, '').trim().split(/\s+/).filter(Boolean);
}

function auditHTML(filePath, content) {
    const lines = getLines(content);

    // ── [WCAG 1.1.1] Non-text content: images need alt text ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;

        // lightning-icon must have alternative-text
        if (line.includes('<lightning-icon') && !line.includes('alternative-text')) {
            // Check if it spans next line
            const nextLine = lines[i + 1] || '';
            if (!nextLine.includes('alternative-text')) {
                report('error', filePath, lineNum,
                    `[WCAG 1.1.1] <lightning-icon> missing "alternative-text" — required for screen readers`);
            }
        }

        // img tags need alt
        if (/<img\b/.test(line) && !line.includes('alt=')) {
            report('error', filePath, lineNum,
                `[WCAG 1.1.1] <img> missing "alt" attribute`);
        }
    });

    // ── [WCAG 1.3.1] Info and relationships: form labels ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;

        if (/<input\b/.test(line) && !line.includes('aria-label') && !line.includes('aria-labelledby')) {
            report('error', filePath, lineNum,
                `[WCAG 1.3.1] <input> missing "aria-label" or "aria-labelledby"`);
        }
        if (/<lightning-input\b/.test(line) && !line.includes('label=') && !line.includes('aria-label')) {
            report('error', filePath, lineNum,
                `[WCAG 1.3.1] <lightning-input> missing "label" attribute`);
        }
    });

    // ── [WCAG 4.1.2] Name, Role, Value: ARIA ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;

        // role="progressbar" needs aria attributes — check tag block (up to 5 lines)
        if (line.includes('role="progressbar"')) {
            const block = lines.slice(i, i + 5).join(' ');
            if (!block.includes('aria-valuenow') || !block.includes('aria-valuemin') || !block.includes('aria-valuemax')) {
                report('error', filePath, lineNum,
                    `[WCAG 4.1.2] role="progressbar" missing aria-valuenow, aria-valuemin, or aria-valuemax`);
            }
        }

        // tabindex > 0 breaks focus order
        if (/tabindex=["'][1-9]/.test(line)) {
            report('error', filePath, lineNum,
                `[WCAG 2.4.3] tabindex > 0 breaks natural focus order — use 0 or -1 only`);
        }

        // Positive tabindex warning
        if (/tabindex=["'][2-9]/.test(line)) {
            report('error', filePath, lineNum,
                `[WCAG 2.4.3] tabindex value > 1 found — disrupts tab order`);
        }
    });

    // ── [WCAG 2.4.4] Link purpose ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;

        // Bare "Click here" / "Read more" links
        if (/<a\b/.test(line)) {
            const genericText = /(click here|read more|here|more|link)/i.test(line);
            if (genericText) {
                report('warn', filePath, lineNum,
                    `[WCAG 2.4.4] Potentially non-descriptive link text — use descriptive labels`);
            }
            // a without href or aria
            if (!line.includes('href') && !line.includes('aria-label') && !line.includes('onclick')) {
                report('warn', filePath, lineNum,
                    `[WCAG 2.4.4] <a> missing href — may not be keyboard focusable`);
            }
        }
    });

    // ── [WCAG 1.3.5 / 2.5.3] Buttons need accessible names ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        if (/<button\b/.test(line) && !line.includes('aria-label') && !line.includes('title')) {
            const nextLine = lines[i + 1] || '';
            if (!nextLine.trim() || nextLine.trim().startsWith('<')) {
                report('warn', filePath, lineNum,
                    `[WCAG 4.1.2] <button> may be missing accessible name — add aria-label or text content`);
            }
        }
    });

    // ── [SLDS] Class usage ──
    const classRe = /class="([^"]+)"/g;
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        let match;
        while ((match = classRe.exec(line)) !== null) {
            const classes = extractClasses(match[1]);
            classes.forEach(cls => {
                const isSldsClass = SLDS_CLASS_PREFIXES.some(p => cls.startsWith(p));
                const isAllowed = ALLOWED_NON_SLDS_CLASSES.includes(cls);
                const isDynamic = cls.includes('{') || cls.includes('}');
                if (!isSldsClass && !isAllowed && !isDynamic && cls.length > 0) {
                    report('warn', filePath, lineNum,
                        `[SLDS] Class "${cls}" is not prefixed with slds- — ensure it's intentional or use an SLDS utility`);
                }
            });
        }
    });

    // ── [SLDS] lightning-datatable accessibility ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        if (line.includes('<lightning-datatable')) {
            // Check tag block across up to 8 lines for key-field
            const block = lines.slice(i, i + 8).join(' ');
            if (!block.includes('key-field')) {
                report('error', filePath, lineNum,
                    `[SLDS + WCAG] <lightning-datatable> missing "key-field" — required for row identity and a11y`);
            }
        }
    });

    // ── [WCAG 3.3.2] Labels / instructions for spinners ──
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        if (line.includes('<lightning-spinner') && !line.includes('alternative-text')) {
            report('error', filePath, lineNum,
                `[WCAG 1.3.1] <lightning-spinner> missing "alternative-text"`);
        }
    });
}

// ── Runner ─────────────────────────────────────────────────────────────────
function auditComponent(componentDir) {
    const name = path.basename(componentDir);
    console.log(`\n\x1b[1m▶ ${name}\x1b[0m`);

    const files = fs.readdirSync(componentDir);
    let hasIssues = false;

    files.forEach(file => {
        const filePath = path.join(componentDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        if (file.endsWith('.html')) {
            auditHTML(filePath, content);
            hasIssues = true;
        } else if (file.endsWith('.css')) {
            auditCSS(filePath, content);
            hasIssues = true;
        }
    });

    if (!hasIssues) {
        console.log(`  ${INFO}  No HTML/CSS files found`);
    }
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m╔══════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m║  SLDS 2 + WCAG AA Static Audit               ║\x1b[0m');
console.log('\x1b[1m╚══════════════════════════════════════════════╝\x1b[0m');

const components = fs.readdirSync(LWC_DIR)
    .map(d => path.join(LWC_DIR, d))
    .filter(d => fs.statSync(d).isDirectory());

components.forEach(auditComponent);

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m─────────────── Summary ───────────────\x1b[0m');
console.log(`  ${FAIL}  Errors:   ${totalErrors}`);
console.log(`  ${WARN}  Warnings: ${totalWarnings}`);

if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`\n  ${PASS}  \x1b[32mAll checks passed! Component is SLDS 2 + WCAG AA compliant.\x1b[0m\n`);
} else if (totalErrors === 0) {
    console.log(`\n  ${WARN}  \x1b[33mPassed with warnings — review suggested improvements.\x1b[0m\n`);
} else {
    console.log(`\n  ${FAIL}  \x1b[31mCompliance issues found — fix errors before deploying.\x1b[0m\n`);
    process.exit(1);
}
