import { StyleSheet, Platform } from 'react-native';

// ═══════════════════════════════════════════════════
//  3AMMM — Brand Color System
//  Primary:  Sky Blue  #87ceeb  (brand identity, accents)
//  Action:   Gold      #fbb040  (CTAs, active states)
//  Base:     Navy      #043954  (structure, depth)
// ═══════════════════════════════════════════════════

export const DarkColors = {
  // ── BACKGROUNDS ─────────────────────────────────
  bg:          '#010f18',
  bgDeep:      '#000a12',
  background:  '#010f18',
  surface:     '#021624',
  surfaceHigh: '#032538',
  overlay:     'rgba(1,12,22,0.88)',

  // ── NAVY (structure) ─────────────────────────────
  navy:        '#043954',
  navyLight:   '#0a5a7a',
  navyGlow:    'rgba(4,57,84,0.50)',

  // ── SKY BLUE (primary brand accent) ─────────────
  // This is your brand color — used for active states,
  // highlights, labels, icon fills, pill indicators
  sky:         '#87ceeb',
  skyDeep:     '#5bb8e0',        // darker sky for pressed states
  skyLight:    '#aeddf2',        // lighter sky for subtle highlights
  skyGlow:     'rgba(135,206,235,0.18)',
  skyGlowSoft: 'rgba(135,206,235,0.08)',
  skyBright:   'rgba(135,206,235,0.92)',
  skyPale:     'rgba(135,206,235,0.06)',
  skyMid:      'rgba(135,206,235,0.14)',
  skyBorder:   'rgba(135,206,235,0.20)',

  // ── GOLD (CTA + action only) ─────────────────────
  // Used sparingly: buttons, key badges, save/confirm
  // Do NOT use for tabs, labels, or decorative accents
  gold:        '#fbb040',
  goldDark:    '#d4920e',
  goldGlow:    'rgba(251,176,64,0.22)',
  goldDeep:    'rgba(251,176,64,0.08)',
  goldBorder:  'rgba(251,176,64,0.28)',

  // ── BORDERS ──────────────────────────────────────
  border:      'rgba(135,206,235,0.10)',
  border2:     'rgba(135,206,235,0.16)',
  borderBright:'rgba(135,206,235,0.22)',
  borderGlow:  'rgba(135,206,235,0.30)',

  // ── TEXT ─────────────────────────────────────────
  text:        '#f0f8ff',                    // primary — near white
  text2:       '#87ceeb',                    // secondary — sky (brand)
  text3:       'rgba(135,206,235,0.45)',     // muted — sky 45%
  text4:       'rgba(240,248,255,0.20)',     // ghost

  // ── SEMANTIC ─────────────────────────────────────
  danger:      '#ff5f5f',
  dangerBg:    'rgba(255,95,95,0.10)',
  success:     '#51cf66',
  successBg:   'rgba(81,207,102,0.10)',

  // ── GLASS ────────────────────────────────────────
  glass:       'rgba(135,206,235,0.07)',
  glassSoft:   'rgba(135,206,235,0.04)',
  glassBorder: 'rgba(135,206,235,0.12)',

  // ── LEGACY ALIASES (keeps old imports working) ───
  bg2:         '#021624',
  bg3:         '#032538',
};

export const LightColors = {
  // ── BACKGROUNDS ─────────────────────────────────
  bg:          '#f4fafd',      // very light sky tint
  bgDeep:      '#e8f5fc',
  background:  '#f4fafd',
  surface:     '#ffffff',
  surfaceHigh: '#e0f2fb',
  overlay:     'rgba(244,250,253,0.94)',

  // ── NAVY ─────────────────────────────────────────
  navy:        '#043954',
  navyLight:   '#0a5a7a',
  navyGlow:    'rgba(4,57,84,0.12)',

  // ── SKY BLUE (primary brand accent) ─────────────
  sky:         '#2a8ab8',      // deeper for readability on light bg
  skyDeep:     '#1a6d96',
  skyLight:    '#5aadd4',
  skyGlow:     'rgba(42,138,184,0.14)',
  skyGlowSoft: 'rgba(42,138,184,0.07)',
  skyBright:   'rgba(42,138,184,0.90)',
  skyPale:     'rgba(42,138,184,0.06)',
  skyMid:      'rgba(42,138,184,0.12)',
  skyBorder:   'rgba(42,138,184,0.20)',

  // ── GOLD (CTA only) ──────────────────────────────
  gold:        '#d4920e',      // darker gold for light bg contrast
  goldDark:    '#a87008',
  goldGlow:    'rgba(212,146,14,0.18)',
  goldDeep:    'rgba(212,146,14,0.07)',
  goldBorder:  'rgba(212,146,14,0.25)',

  // ── BORDERS ──────────────────────────────────────
  border:      'rgba(4,57,84,0.10)',
  border2:     'rgba(4,57,84,0.16)',
  borderBright:'rgba(4,57,84,0.20)',
  borderGlow:  'rgba(42,138,184,0.25)',

  // ── TEXT ─────────────────────────────────────────
  text:        '#0d2233',
  text2:       '#1a6d96',      // sky-based secondary
  text3:       'rgba(4,57,84,0.45)',
  text4:       'rgba(13,34,51,0.22)',

  // ── SEMANTIC ─────────────────────────────────────
  danger:      '#dc2626',
  dangerBg:    'rgba(220,38,38,0.08)',
  success:     '#16a34a',
  successBg:   'rgba(22,163,74,0.08)',

  // ── GLASS ────────────────────────────────────────
  glass:       'rgba(4,57,84,0.05)',
  glassSoft:   'rgba(4,57,84,0.03)',
  glassBorder: 'rgba(4,57,84,0.10)',

  // ── LEGACY ALIASES ───────────────────────────────
  bg2:         '#ffffff',
  bg3:         '#e0f2fb',
  goldPale:    '#fff3d6',
};

// Default export always points to dark
export const Colors = DarkColors;

// ═══════════════════════════════════════════════════
//  USAGE GUIDE
//
//  Colors.sky       → brand accents, active tabs,
//                     section labels, singer names,
//                     icon fills, pill indicators,
//                     filter pills active state
//
//  Colors.gold      → CTA buttons only (Save, Login,
//                     Add song), key badges, confirm
//                     actions. Nothing decorative.
//
//  Colors.navy      → headers, deep backgrounds,
//                     stat cards, structural elements
//
//  Colors.text      → primary body text
//  Colors.text2     → = sky. Secondary labels
//  Colors.text3     → muted hints, timestamps
// ═══════════════════════════════════════════════════

export const Typography = {
  xs:      11,
  sm:      13,
  base:    15,
  md:      18,
  lg:      22,
  xl:      28,
  xxl:     32,
  display: 44,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 32,
};

export const Radius = {
  xs:   6,
  sm:   10,
  md:   16,
  lg:   20,
  xl:   28,
  full: 999,
};

export const AppStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DarkColors.bg,
  },

  // ── HERO ─────────────────────────────────────────
  heroPanel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: Typography.display,
    fontWeight: '800',
    color: DarkColors.sky,        // ← sky, not gold
    letterSpacing: 10,
    lineHeight: 52,
  },
  heroSubtitle: {
    fontSize: Typography.md,
    color: DarkColors.text2,
    letterSpacing: 1,
    marginTop: 8,
    opacity: 0.8,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingBottom: 16,
    backgroundColor: DarkColors.bg,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: DarkColors.text,
  },
  headerSub: {
    fontSize: Typography.sm,
    color: DarkColors.text2,
    marginTop: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  langToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: DarkColors.skyPale,
  },
  langToggleText: {
    color: DarkColors.sky,
    fontWeight: '700',
  },
  keyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: DarkColors.surface,
  },
  keyChipText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: DarkColors.text2,
  },
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: DarkColors.text2,
  },
  primaryBtn: {
    backgroundColor: DarkColors.sky,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: Typography.base,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: DarkColors.sky,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtn: {
    borderColor: DarkColors.danger,
  },
  outlineBtnText: {
    color: DarkColors.sky,
    fontWeight: '700',
    fontSize: Typography.base,
  },
  dangerBtnText: {
    color: DarkColors.danger,
    fontWeight: '700',
  },
  fieldWrap: {
    marginBottom: Spacing.lg,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: DarkColors.text,
  },
  fieldHint: {
    fontSize: Typography.xs,
    color: DarkColors.text3,
  },
  input: {
    borderWidth: 1,
    borderColor: DarkColors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: DarkColors.surface,
    color: DarkColors.text,
  },
  inputMulti: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DarkColors.surface,
  },
  iconBtnDanger: {
    backgroundColor: DarkColors.dangerBg,
  },
  statCard: {
    backgroundColor: DarkColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statNum: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: DarkColors.text,
  },
  statLabel: {
    fontSize: Typography.sm,
    color: DarkColors.text2,
    marginTop: 4,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: DarkColors.surface,
  },

  // ── GLASS CARD ───────────────────────────────────
  glassCard: {
    backgroundColor: DarkColors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DarkColors.glassBorder,
    padding: 18,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: DarkColors.text,
    marginBottom: 16,
  },

  // ── AUTH ──────────────────────────────────────────
  authBody: {
    flex: 1,
    padding: Spacing.xl,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: Spacing.xs,
  },
  switchText: {
    fontSize: Typography.base,
    color: DarkColors.text3,
  },
  switchLink: {
    fontSize: Typography.base,
    color: DarkColors.sky,        // ← sky link
    fontWeight: '700',
  },
  demoBox: {
    marginTop: 20,
    backgroundColor: DarkColors.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: DarkColors.skyBorder,  // ← sky border
    padding: 14,
  },
  demoTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: DarkColors.sky,        // ← sky, not gold
    marginBottom: 6,
  },
  demoText: {
    fontSize: Typography.sm,
    color: DarkColors.text2,
    lineHeight: 18,
  },
  errText: {
    fontSize: Typography.sm,
    color: DarkColors.danger,
    marginBottom: 10,
    textAlign: 'center',
  },

  // ── MISC ─────────────────────────────────────────
  body: {
    flex: 1,
    padding: Spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(135,206,235,0.08)',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyWrap: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.base,
    color: DarkColors.text2,
    textAlign: 'center',
    lineHeight: 22,
  },
});