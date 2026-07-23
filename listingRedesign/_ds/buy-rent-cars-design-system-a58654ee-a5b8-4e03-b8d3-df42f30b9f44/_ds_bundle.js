/* @ds-bundle: {"format":4,"namespace":"BuyRentCarsDesignSystem_a58654","components":[{"name":"StatusBadge","sourcePath":"components/badges/StatusBadge.jsx"},{"name":"Tag","sourcePath":"components/badges/Tag.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"SocialIcon","sourcePath":"components/brand/SocialIcon.jsx"},{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"CarCard","sourcePath":"components/cards/CarCard.jsx"},{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"ContactCard","sourcePath":"components/cards/ContactCard.jsx"},{"name":"RequestCard","sourcePath":"components/cards/RequestCard.jsx"},{"name":"StatCard","sourcePath":"components/cards/StatCard.jsx"},{"name":"Accordion","sourcePath":"components/feedback/Accordion.jsx"},{"name":"StarRating","sourcePath":"components/feedback/StarRating.jsx"},{"name":"Testimonial","sourcePath":"components/feedback/Testimonial.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Breadcrumbs","sourcePath":"components/navigation/Breadcrumbs.jsx"},{"name":"FilterChip","sourcePath":"components/navigation/FilterChip.jsx"},{"name":"NavLink","sourcePath":"components/navigation/NavLink.jsx"},{"name":"Navbar","sourcePath":"components/navigation/Navbar.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"SiteFooter","sourcePath":"components/navigation/SiteFooter.jsx"}],"sourceHashes":{"components/badges/StatusBadge.jsx":"1ef91ebee883","components/badges/Tag.jsx":"dd4bc0f51605","components/brand/Logo.jsx":"cc14b8cae249","components/brand/SocialIcon.jsx":"96ba86bf9a13","components/buttons/Button.jsx":"7950a59b3682","components/buttons/IconButton.jsx":"c3b01a322ff9","components/cards/CarCard.jsx":"fcd22783b12f","components/cards/Card.jsx":"bb6f49b5483c","components/cards/ContactCard.jsx":"4770b582f7ca","components/cards/RequestCard.jsx":"78e9dbd19e2b","components/cards/StatCard.jsx":"47a1037bab1c","components/feedback/Accordion.jsx":"1009316499d7","components/feedback/StarRating.jsx":"a10821a6a9bb","components/feedback/Testimonial.jsx":"ffc38eb80349","components/forms/Checkbox.jsx":"e6cf54c30125","components/forms/Input.jsx":"74fc3a441023","components/forms/Radio.jsx":"9e03f4b31ed4","components/forms/Select.jsx":"d8ba1e55aa2a","components/navigation/Breadcrumbs.jsx":"5cc444118f9c","components/navigation/FilterChip.jsx":"a86c81678007","components/navigation/NavLink.jsx":"d56e07b70822","components/navigation/Navbar.jsx":"d8b47d15fd22","components/navigation/Pagination.jsx":"85a30ae8d8b9","components/navigation/SiteFooter.jsx":"c703a2860409","ui_kits/dashboard/DashSections.jsx":"851ffe917b1b","ui_kits/inspection-booking/BookingModal.jsx":"d7bd17614f72","ui_kits/marketing/Footer.jsx":"507a2ff66dd4","ui_kits/marketing/Header.jsx":"4d676d7f4cd5","ui_kits/marketing/Hero.jsx":"ec42edc69bd7","ui_kits/marketing/Listings.jsx":"72302016794a","ui_kits/marketing/Sections.jsx":"5845f7dcbb23"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BuyRentCarsDesignSystem_a58654 = window.BuyRentCarsDesignSystem_a58654 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/badges/StatusBadge.jsx
try { (() => {
/**
 * StatusBadge — request status pill.
 * From source: radius 100, Geist 12, tinted background per status with
 * a small solid dot-icon. pending yellow, approved green, rejected red.
 */
const CONFIG = {
  pending: {
    label: 'Pending',
    bg: 'var(--warning-bg)',
    dot: 'var(--warning)',
    text: 'var(--warning-ink)',
    icon: 'clock'
  },
  approved: {
    label: 'Approved',
    bg: 'var(--success-bg)',
    dot: 'var(--success)',
    text: 'var(--success)',
    icon: 'check'
  },
  rejected: {
    label: 'Rejected',
    bg: 'rgb(253,235,235)',
    dot: 'var(--danger)',
    text: 'var(--danger-2)',
    icon: 'x'
  },
  none: {
    label: 'No Request',
    bg: 'var(--surface-muted)',
    dot: 'var(--ink-500)',
    text: 'var(--ink-700)',
    icon: 'minus'
  }
};
function StatusBadge({
  status = 'pending',
  label,
  style = {}
}) {
  const c = CONFIG[status] || CONFIG.pending;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: c.bg,
      borderRadius: 100,
      padding: '4px 12px 4px 4px',
      fontFamily: 'var(--font-label)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 100,
      background: c.dot,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-bold ph-' + c.icon,
    style: {
      fontSize: 9
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      lineHeight: 1.2,
      color: c.text
    }
  }, label || c.label));
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/badges/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/badges/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — small chip for body type / category labels (e.g. "Sedan").
 * Muted fill, radius 8, Manrope 12.
 */
function Tag({
  children,
  tone = 'muted',
  style = {},
  ...rest
}) {
  const tones = {
    muted: {
      background: 'var(--surface-muted)',
      color: 'var(--ink-700)'
    },
    navy: {
      background: 'var(--brand-navy-soft)',
      color: 'var(--brand-navy)'
    },
    orange: {
      background: 'var(--peach-bg)',
      color: 'var(--brand-orange-2)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--ink-700)',
      border: '1px solid var(--line-200)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: 8,
      padding: '4px 10px',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      lineHeight: 1.4,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/badges/Tag.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
/**
 * Logo — the Buy & Rent Cars wordmark. The source ships a single
 * raster wordmark (assets/logo.png); render it, don't redraw it.
 * `assetBase` points to the folder containing /assets (default is the
 * project root as seen from a card in components/<group>/).
 */
function Logo({
  height = 40,
  assetBase = '../..',
  alt = 'Buy & Rent Cars',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("img", {
    src: `${assetBase}/assets/logo.png`,
    alt: alt,
    style: {
      height,
      width: 'auto',
      display: 'block',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/brand/SocialIcon.jsx
try { (() => {
/**
 * SocialIcon — social platform icon chip used in the footer.
 * The source defines 26 platforms in two colourways. Here they render
 * from Phosphor brand glyphs. Footer style: navy-tint square, radius 4.
 */
const GLYPH = {
  facebook: 'facebook-logo',
  x: 'x-logo',
  twitter: 'x-logo',
  instagram: 'instagram-logo',
  whatsapp: 'whatsapp-logo',
  linkedin: 'linkedin-logo',
  youtube: 'youtube-logo',
  tiktok: 'tiktok-logo',
  telegram: 'telegram-logo',
  snapchat: 'snapchat-logo',
  pinterest: 'pinterest-logo',
  discord: 'discord-logo',
  github: 'github-logo',
  dribbble: 'dribbble-logo',
  behance: 'behance-logo',
  medium: 'medium-logo',
  reddit: 'reddit-logo',
  threads: 'threads-logo',
  messenger: 'messenger-logo',
  google: 'google-logo'
};
function SocialIcon({
  platform = 'facebook',
  variant = 'onDark',
  size = 24,
  href,
  style = {}
}) {
  const glyph = GLYPH[platform] || 'link';
  const variants = {
    onDark: {
      background: 'rgb(153,153,209)',
      color: 'var(--white)'
    },
    solid: {
      background: 'var(--brand-navy)',
      color: 'var(--white)'
    },
    subtle: {
      background: 'var(--surface-muted)',
      color: 'var(--ink-700)'
    },
    plain: {
      background: 'transparent',
      color: 'var(--ink-700)'
    }
  };
  const inner = /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 4,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...variants[variant],
      ...style
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + glyph,
    style: {
      fontSize: Math.round(size * 0.66)
    }
  }));
  return href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    "aria-label": platform,
    style: {
      display: 'inline-flex'
    }
  }, inner) : inner;
}
Object.assign(__ds_scope, { SocialIcon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/SocialIcon.jsx", error: String((e && e.message) || e) }); }

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Buy & Rent Cars primary action control.
 * Values from source: navy fill rgb(0,0,139), radius 8, 16px padding,
 * 8px gap, Manrope 700 14px, height 48 (min 40).
 */
function Button({
  children,
  variant = 'primary',
  size = 'lg',
  startIcon,
  endIcon,
  disabled = false,
  full = false,
  as = 'button',
  style = {},
  ...rest
}) {
  const Tag = as;
  const base = {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    boxSizing: 'border-box',
    transition: 'background-color .15s ease, color .15s ease, border-color .15s ease, transform .05s ease',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    width: full ? '100%' : undefined
  };
  const sizes = {
    lg: {
      height: 48,
      minHeight: 40,
      padding: '16px 16px',
      borderRadius: 8,
      fontSize: 14
    },
    md: {
      height: 44,
      padding: '12px 16px',
      borderRadius: 8,
      fontSize: 14
    },
    sm: {
      height: 36,
      padding: '8px 14px',
      borderRadius: 8,
      fontSize: 13
    }
  };
  const variants = {
    primary: {
      backgroundColor: 'var(--brand-navy)',
      color: 'var(--surface-muted)',
      borderColor: 'var(--brand-navy)'
    },
    secondary: {
      backgroundColor: 'var(--surface-dark)',
      color: 'var(--white)',
      borderColor: 'var(--surface-dark)'
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--brand-navy)',
      borderColor: 'var(--line-200)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--ink-900)',
      borderColor: 'transparent'
    },
    accent: {
      backgroundColor: 'var(--brand-orange)',
      color: 'var(--white)',
      borderColor: 'var(--brand-orange)'
    }
  };
  const disabledStyle = disabled ? {
    backgroundColor: 'var(--brand-navy-tint)',
    color: 'var(--ink-500)',
    borderColor: 'var(--brand-navy-tint)'
  } : null;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    disabled: as === 'button' ? disabled : undefined,
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...disabledStyle,
      ...style
    }
  }, rest), startIcon, children != null && /*#__PURE__*/React.createElement("span", null, children), endIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square icon-only control. Used for header actions
 * (notifications, profile), carousel arrows, and card overflow.
 */
function IconButton({
  icon,
  variant = 'ghost',
  size = 44,
  round = false,
  disabled = false,
  ariaLabel,
  style = {},
  ...rest
}) {
  const variants = {
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--ink-900)',
      border: '1px solid transparent'
    },
    outline: {
      backgroundColor: 'var(--white)',
      color: 'var(--ink-900)',
      border: '1px solid var(--line-200)'
    },
    solid: {
      backgroundColor: 'var(--brand-navy)',
      color: 'var(--white)',
      border: '1px solid var(--brand-navy)'
    },
    muted: {
      backgroundColor: 'var(--surface-muted)',
      color: 'var(--ink-700)',
      border: '1px solid transparent'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    disabled: disabled,
    style: {
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: round ? 100 : 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: Math.round(size * 0.45),
      opacity: disabled ? 0.5 : 1,
      transition: 'background-color .15s ease, border-color .15s ease',
      boxSizing: 'border-box',
      ...variants[variant],
      ...style
    }
  }, rest), icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/cards/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — generic surface container used across dashboards & panels.
 * White surface, 1px rgb(232,233,233) border, radius 16, soft shadow.
 */
function Card({
  children,
  padding = 24,
  radius = 16,
  bordered = true,
  shadow = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: bordered ? '1px solid var(--line-200)' : 'none',
      borderRadius: radius,
      padding,
      boxShadow: shadow ? 'var(--shadow-md)' : 'none',
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/ContactCard.jsx
try { (() => {
/**
 * ContactCard — contact detail tile (source "Contact Us" family).
 * Icon in a navy square, label + value. Used in the Contact page and
 * footer contact column.
 */
function ContactCard({
  icon = 'envelope',
  label = 'Email',
  value = 'info@buyandrentcars.com',
  href,
  style = {}
}) {
  const inner = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'var(--white)',
      border: '1px solid var(--line-200)',
      borderRadius: 12,
      padding: 16,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 8,
      background: 'var(--brand-navy)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: 20
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--ink-900)',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, value)));
  return href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      textDecoration: 'none',
      display: 'block'
    }
  }, inner) : inner;
}
Object.assign(__ds_scope, { ContactCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ContactCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/RequestCard.jsx
try { (() => {
/**
 * RequestCard — request list row (source "Component 11 / 24",
 * "Rent_Pending"). Muted rgb(250,250,250) surface, radius 8, car
 * thumbnail + title/owner + type·duration·price + StatusBadge.
 * An optional footer note / action mirrors the dashboard list.
 */
function RequestCard({
  image,
  title = 'Lexus NX 300h',
  owner = 'Hilary Emmanuel',
  type = 'Rent',
  duration,
  price = '₦175,000',
  status = 'pending',
  note,
  action,
  onAction,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'var(--surface-muted)',
      borderRadius: 8,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image || '../../assets/car-lexus.png',
    alt: title,
    style: {
      width: 80,
      height: 60,
      objectFit: 'contain',
      background: 'var(--white)',
      borderRadius: 6.4,
      border: '1px solid var(--line-200)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--ink-900)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)',
      marginBottom: 6
    }
  }, owner), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13,
      color: 'var(--ink-700)'
    }
  }, /*#__PURE__*/React.createElement("span", null, type), duration && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "\u2022"), /*#__PURE__*/React.createElement("span", null, duration)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "\u2022"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand-navy)',
      fontWeight: 700
    }
  }, price))), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: status
  })), (note || action) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 4px 0',
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement("span", null, note), action && /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onAction && onAction();
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--brand-navy)',
      fontWeight: 700,
      textDecoration: 'none'
    }
  }, action, " ", /*#__PURE__*/React.createElement("i", {
    className: "ph ph-arrow-right"
  }))));
}
Object.assign(__ds_scope, { RequestCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/RequestCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/StatCard.jsx
try { (() => {
/**
 * StatCard — dashboard metric tile. 1px coloured border keyed to the
 * metric's semantic colour (navy total / amber pending / green
 * approved / orange loyalty), icon in a solid coloured circle, label
 * and large value. (Source: Customer Dashboard.)
 */
const TONES = {
  navy: 'var(--brand-navy)',
  amber: 'var(--warning)',
  green: 'var(--success)',
  orange: 'var(--brand-orange-deep)'
};
function StatCard({
  icon = 'car',
  label = 'Total Requests',
  value = '0',
  suffix,
  tone = 'navy',
  style = {}
}) {
  const c = TONES[tone] || TONES.navy;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${c}`,
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 100,
      background: c,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: 16
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--ink-700)'
    }
  }, label)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--ink-900)'
    }
  }, value, suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 400,
      color: 'var(--ink-500)'
    }
  }, " ", suffix)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Accordion.jsx
try { (() => {
/**
 * Accordion — FAQ item (source "faq" / Property 1=dedault).
 * Collapsed: navy-soft rgb(230,230,243) surface, radius 8, heading
 * Manrope 16 in navy-deep rgb(0,0,83), chevron-down. Expands to reveal
 * the answer. Controlled via `open` or self-managed if omitted.
 */
function Accordion({
  heading = 'How do I rent a car on Buy and Rent Cars?',
  children,
  open,
  defaultOpen = false,
  onToggle,
  style = {}
}) {
  const [internal, setInternal] = React.useState(defaultOpen);
  const isOpen = open === undefined ? internal : open;
  const toggle = () => {
    if (open === undefined) setInternal(!internal);
    onToggle && onToggle(!isOpen);
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: toggle,
    style: {
      background: 'var(--brand-navy-soft)',
      borderRadius: 8,
      padding: '20px 24px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 16,
      lineHeight: 1.5,
      color: 'var(--brand-navy-deep)',
      fontWeight: isOpen ? 600 : 400
    }
  }, heading), /*#__PURE__*/React.createElement("i", {
    className: 'ph ph-caret-' + (isOpen ? 'up' : 'down'),
    style: {
      fontSize: 20,
      color: 'var(--ink-500)'
    }
  })), isOpen && children != null && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--ink-700)'
    }
  }, children));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StarRating.jsx
try { (() => {
/**
 * StarRating — orange five-star rating used on car cards.
 * Filled stars rgb(255,149,0); empty stars rgb(232,233,233).
 */
function StarRating({
  value = 4,
  max = 5,
  size = 16,
  gap = 0,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap,
      ...style
    },
    "aria-label": `${value} of ${max} stars`
  }, Array.from({
    length: max
  }).map((_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i < Math.round(value) ? 'ph-fill ph-star' : 'ph ph-star',
    style: {
      fontSize: size,
      color: i < Math.round(value) ? 'var(--brand-orange)' : 'var(--line-200)',
      padding: 2
    }
  })));
}
Object.assign(__ds_scope, { StarRating });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StarRating.jsx", error: String((e && e.message) || e) }); }

// components/cards/CarCard.jsx
try { (() => {
/**
 * CarCard — the core marketplace listing card (rent / buy / sell).
 * Structure & values from source "Property 1=Landing Car Card":
 * 360w, image box 320h radius 16 on rgb(250,250,250), 24px gap,
 * title Manrope 16, price Manrope 700 24, metadata row with pin.
 */
function CarCard({
  image,
  title = 'Lexus NX 300h',
  bodyType = 'Sedan',
  location = 'Lagos, Nigeria',
  price = '₦35,000',
  priceSuffix = '/day',
  rating = 4,
  ctaLabel = 'Rent Now',
  onCta,
  width = 360,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 320,
      borderRadius: 16,
      overflow: 'hidden',
      background: 'var(--surface-muted)'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      padding: '56px 24px'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--ink-400)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-car",
    style: {
      fontSize: 64
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      top: 12,
      background: 'var(--white)',
      borderRadius: 100,
      padding: 2,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StarRating, {
    value: rating,
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      paddingBottom: 10,
      borderBottom: '1px solid var(--line-200)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      lineHeight: 1.5,
      color: 'var(--ink-900)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      lineHeight: 1.4,
      color: 'var(--ink-700)',
      background: 'var(--surface-muted)',
      borderRadius: 8,
      padding: '4px 10px'
    }
  }, bodyType)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      color: 'var(--ink-700)',
      fontSize: 12,
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-map-pin",
    style: {
      fontSize: 16
    }
  }), /*#__PURE__*/React.createElement("span", null, location))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 1.2,
      color: 'var(--ink-900)'
    }
  }, price, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 400
    }
  }, priceSuffix)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "lg",
    onClick: onCta,
    endIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-arrow-right"
    })
  }, ctaLabel))));
}
Object.assign(__ds_scope, { CarCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CarCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Testimonial.jsx
try { (() => {
/**
 * Testimonial — client review card (source "Client's Success Stories"
 * section). White card, star rating, name + role, quote.
 */
function Testimonial({
  rating = 5,
  name = 'John Adewara',
  role = 'Civil Engineer',
  quote,
  width = 360,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      background: 'var(--white)',
      borderRadius: 16,
      padding: 24,
      fontFamily: 'var(--font-body)',
      boxShadow: 'var(--shadow-sm)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StarRating, {
    value: rating,
    size: 16
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      marginTop: 12,
      color: 'var(--ink-900)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, role), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--ink-700)',
      margin: '8px 0 0'
    }
  }, quote || 'I rented a car for a weekend trip through Buy & Rent Cars, and it was seamless from start to finish. The car was clean, the process was fast, and the price was just right.'));
}
Object.assign(__ds_scope, { Testimonial });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Testimonial.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/**
 * Checkbox — 24×24, radius 4. Unchecked: 1px inset rgb(151,152,154).
 * Checked: navy fill rgb(0,0,139) with white check. (Source values.)
 */
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-body)',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 4,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? 'var(--brand-navy)' : 'transparent',
      boxShadow: checked ? 'none' : 'inset 0 0 0 1px var(--ink-500)',
      transition: 'background .12s ease'
    }
  }, checked && /*#__PURE__*/React.createElement("i", {
    className: "ph-bold ph-check",
    style: {
      color: 'var(--white)',
      fontSize: 14
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--ink-900)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with optional label and leading icon.
 * White fill, 1px rgb(232,233,233) border, radius 8, height 48,
 * placeholder rgb(178,179,179), Manrope 14.
 */
function Input({
  label,
  icon,
  placeholder,
  type = 'text',
  value,
  onChange,
  hint,
  error,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--ink-700)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 48,
      padding: '0 16px',
      background: 'var(--white)',
      border: `1px solid ${error ? 'var(--danger)' : 'var(--line-200)'}`,
      borderRadius: 8,
      boxSizing: 'border-box'
    }
  }, icon && /*#__PURE__*/React.createElement("i", {
    className: 'ph ph-' + icon,
    style: {
      fontSize: 18,
      color: 'var(--ink-500)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'inherit',
      fontSize: 14,
      color: 'var(--ink-900)',
      minWidth: 0
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: error ? 'var(--danger-2)' : 'var(--ink-500)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
/**
 * Radio — 24×24 circle. Unchecked: 1px inset rgb(151,152,154).
 * Checked: 1px inset navy + 12×12 navy dot. (Source values.)
 */
function Radio({
  checked = false,
  onChange,
  label,
  name,
  value,
  disabled = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-body)',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 1000,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `inset 0 0 0 1px ${checked ? 'var(--brand-navy)' : 'var(--ink-500)'}`
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: 1000,
      background: 'var(--brand-navy)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--ink-900)'
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — dropdown control matching the landing-page filters
 * (Location / Car Type / Price Range). Native <select> styled to the
 * brand: white fill, radius 8, height 48, caret via Phosphor.
 */
function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'All',
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--ink-700)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    style: {
      width: '100%',
      height: 48,
      padding: '0 40px 0 16px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'var(--white)',
      border: '1px solid var(--line-200)',
      borderRadius: 8,
      fontFamily: 'inherit',
      fontSize: 14,
      color: value ? 'var(--ink-900)' : 'var(--ink-400)',
      cursor: 'pointer',
      boxSizing: 'border-box'
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lab = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  })), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-down",
    style: {
      position: 'absolute',
      right: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--ink-700)',
      fontSize: 16
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumbs.jsx
try { (() => {
/**
 * Breadcrumbs — path trail for dashboard / detail views.
 * Manrope 14; muted links, navy current page, caret separators.
 */
function Breadcrumbs({
  items = [],
  style = {}
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      ...style
    }
  }, items.map((item, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("a", {
      href: item.href || '#',
      style: {
        color: last ? 'var(--brand-navy)' : 'var(--ink-500)',
        fontWeight: last ? 600 : 400,
        textDecoration: 'none'
      }
    }, item.label), !last && /*#__PURE__*/React.createElement("i", {
      className: "ph ph-caret-right",
      style: {
        fontSize: 14,
        color: 'var(--ink-400)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { Breadcrumbs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumbs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/FilterChip.jsx
try { (() => {
/**
 * FilterChip — toggleable filter pill used in listing filter bars.
 * Idle: muted fill; active: navy fill, white text.
 */
function FilterChip({
  children,
  active = false,
  onClick,
  icon,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: 100,
      padding: '8px 16px',
      border: `1px solid ${active ? 'var(--brand-navy)' : 'var(--line-200)'}`,
      background: active ? 'var(--brand-navy)' : 'var(--white)',
      color: active ? 'var(--white)' : 'var(--ink-700)',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background .15s ease, color .15s ease, border-color .15s ease',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("i", {
    className: 'ph ph-' + icon,
    style: {
      fontSize: 16
    }
  }), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavLink.jsx
try { (() => {
/**
 * NavLink — header / footer navigation item (source "Frame 1618869249"
 * nav frames). Optional caret for dropdown menus; active state is navy
 * and bold.
 */
function NavLink({
  children,
  href = '#',
  active = false,
  caret = false,
  onClick,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      fontWeight: active ? 700 : 500,
      color: active ? 'var(--brand-navy)' : 'var(--ink-900)',
      textDecoration: 'none',
      ...style
    }
  }, children, caret && /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-down",
    style: {
      fontSize: 14
    }
  }));
}
Object.assign(__ds_scope, { NavLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavLink.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Navbar.jsx
try { (() => {
/**
 * Navbar — the site header (source header nav family). Logo, centre
 * nav links, and either a Sign Up CTA (logged out) or account actions
 * (logged in: notifications / profile / sign-out).
 */
function Navbar({
  loggedIn = false,
  active = 'home',
  assetBase = '../..',
  links,
  onNav = () => {},
  onSignIn = () => {},
  style = {}
}) {
  const items = links || [{
    id: 'about',
    label: 'About Us'
  }, {
    id: 'services',
    label: 'Services',
    caret: true
  }, {
    id: 'contact',
    label: 'Contact Us'
  }, ...(loggedIn ? [{
    id: 'dashboard',
    label: 'Dashboard'
  }] : [])];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 88,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 100px',
      borderBottom: '1px solid var(--line-200)',
      background: 'var(--white)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${assetBase}/assets/logo.png`,
    alt: "Buy & Rent Cars",
    style: {
      height: 44
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 40
    }
  }, items.map(l => /*#__PURE__*/React.createElement(__ds_scope.NavLink, {
    key: l.id,
    active: active === l.id,
    caret: l.caret,
    onClick: e => {
      e.preventDefault();
      onNav(l.id);
    }
  }, l.label))), loggedIn ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      color: 'var(--ink-900)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-bell",
    style: {
      fontSize: 22,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-user",
    style: {
      fontSize: 22,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-sign-out",
    style: {
      fontSize: 22,
      cursor: 'pointer'
    },
    onClick: () => onNav('signout')
  })) : /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-user"
    }),
    onClick: onSignIn
  }, "Sign Up"));
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
/**
 * Pagination — prev/next carousel + numbered page controls used in
 * listing sections ("Most Rented Cars" etc.).
 */
function Pagination({
  page = 1,
  pageCount = 5,
  onChange = () => {},
  style = {}
}) {
  const pages = Array.from({
    length: pageCount
  }, (_, i) => i + 1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    variant: "outline",
    size: 40,
    icon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-caret-left"
    }),
    ariaLabel: "Previous",
    disabled: page <= 1,
    onClick: () => onChange(page - 1)
  }), pages.map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => onChange(p),
    style: {
      width: 40,
      height: 40,
      borderRadius: 8,
      cursor: 'pointer',
      border: `1px solid ${p === page ? 'var(--brand-navy)' : 'var(--line-200)'}`,
      background: p === page ? 'var(--brand-navy)' : 'var(--white)',
      color: p === page ? 'var(--white)' : 'var(--ink-700)',
      fontFamily: 'inherit',
      fontSize: 14,
      fontWeight: 600
    }
  }, p)), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    variant: "outline",
    size: 40,
    icon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-caret-right"
    }),
    ariaLabel: "Next",
    disabled: page >= pageCount,
    onClick: () => onChange(page + 1)
  }));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteFooter.jsx
try { (() => {
/**
 * SiteFooter — the dark site footer (source "footer nav" family).
 * Logo + blurb + socials, then Quick Links / Services / Contact
 * columns, and a bottom legal bar.
 */
function SiteFooter({
  assetBase = '../..',
  style = {}
}) {
  const col = (title, items) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--white)'
    }
  }, title), items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      fontSize: 14,
      color: 'rgb(232,233,233)',
      textDecoration: 'none'
    }
  }, it)));
  const contact = [['envelope', 'info@buyandrentcars.com'], ['envelope', 'buyandrentcars@gmail.com'], ['phone', '+2348123456789']];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--white)',
      padding: '64px 100px 32px',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 104,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 308,
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${assetBase}/assets/logo.png`,
    alt: "Buy & Rent Cars",
    style: {
      height: 52,
      width: 170,
      objectFit: 'cover',
      objectPosition: 'left'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.4,
      color: 'rgb(232,233,233)'
    }
  }, "Your trusted partner for seamless car rentals. Connecting car owners with customers for the perfect ride.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, ['linkedin', 'instagram', 'facebook', 'x', 'whatsapp'].map(p => /*#__PURE__*/React.createElement(__ds_scope.SocialIcon, {
    key: p,
    platform: p,
    variant: "onDark",
    size: 24
  })))), col('Quick Links', ['Home', 'About Us', 'Contact Us']), col('Services', ['Rent Cars', 'Buy Cars', 'Sell Cars']), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, "Contact"), contact.map(([ic, txt]) => /*#__PURE__*/React.createElement("span", {
    key: txt,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 14,
      color: 'rgb(232,233,233)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 4,
      background: 'var(--brand-navy)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + ic,
    style: {
      fontSize: 13
    }
  })), txt)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 48,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,.12)',
      fontSize: 14,
      color: 'rgb(232,233,233)',
      flexWrap: 'wrap',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", null, "Buy & Rent Cars \xA9 2025 All rights reserved."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24
    }
  }, ['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: 'rgb(232,233,233)',
      textDecoration: 'none'
    }
  }, l)))));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DashSections.jsx
try { (() => {
const {
  Card,
  StatusBadge
} = window.BuyRentCarsDesignSystem_a58654;
function StatCards() {
  const stats = [{
    icon: 'car',
    label: 'Total Requests',
    value: '3',
    color: 'var(--brand-navy)'
  }, {
    icon: 'clock',
    label: 'Pending Requests',
    value: '2',
    color: 'var(--warning)'
  }, {
    icon: 'check-circle',
    label: 'Approved Requests',
    value: '1',
    color: 'var(--success)'
  }, {
    icon: 'gift',
    label: 'Loyalty Point',
    value: '120',
    suffix: 'points',
    color: 'var(--brand-orange-deep)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 24
    }
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      border: `1px solid ${s.color}`,
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 100,
      background: s.color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + s.icon,
    style: {
      fontSize: 16
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--ink-700)'
    }
  }, s.label)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--ink-900)'
    }
  }, s.value, s.suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 400,
      color: 'var(--ink-500)'
    }
  }, " ", s.suffix)))));
}
function QuickLinks() {
  const links = [{
    icon: 'car',
    label: 'Browse Cars',
    bg: 'var(--brand-navy-soft)',
    fg: 'var(--brand-navy)'
  }, {
    icon: 'clock',
    label: 'My Requests',
    bg: 'var(--surface-muted)',
    fg: 'var(--ink-700)'
  }, {
    icon: 'eye',
    label: 'View Transactions',
    bg: 'var(--success-bg)',
    fg: 'var(--success)'
  }, {
    icon: 'gift',
    label: 'Loyalty Reward Center',
    bg: 'var(--peach-bg)',
    fg: 'var(--brand-orange-2)'
  }];
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      margin: '0 0 20px'
    }
  }, "Quick Links"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      background: l.bg,
      color: l.fg,
      border: 'none',
      borderRadius: 8,
      padding: '14px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, l.label, /*#__PURE__*/React.createElement("i", {
    className: 'ph ph-' + l.icon
  })))));
}
function RecentRequests() {
  const rows = [{
    car: 'Lexus NX 300h',
    who: 'Hilary Emmanuel',
    type: 'Rent',
    days: '5 days',
    price: '₦175,000',
    status: 'approved',
    note: 'Approved by Owner',
    action: 'Proceed to payment'
  }, {
    car: 'Lexus NX 300h',
    who: 'Hilary Emmanuel',
    type: 'Rent',
    days: '5 days',
    price: '₦175,000',
    status: 'pending',
    note: 'Waiting for owner approval'
  }, {
    car: 'Lexus NX 300h',
    who: 'Premium Auto Gallery',
    type: 'Buy',
    price: '₦16,000,000',
    status: 'pending',
    note: 'Waiting for owner approval'
  }];
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      margin: '0 0 20px'
    }
  }, "Recent Requests"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'var(--surface-muted)',
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/car-lexus.png",
    alt: r.car,
    style: {
      width: 72,
      height: 56,
      objectFit: 'contain',
      background: 'var(--white)',
      borderRadius: 8,
      border: '1px solid var(--line-200)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700
    }
  }, r.car), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)',
      marginBottom: 6
    }
  }, r.who), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13,
      color: 'var(--ink-700)'
    }
  }, /*#__PURE__*/React.createElement("span", null, r.type), r.days && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "\u2022"), /*#__PURE__*/React.createElement("span", null, r.days)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "\u2022"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand-navy)',
      fontWeight: 700
    }
  }, r.price))), /*#__PURE__*/React.createElement(StatusBadge, {
    status: r.status
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 4px 0',
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement("span", null, r.note), r.action && /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--brand-navy)',
      fontWeight: 700,
      textDecoration: 'none'
    }
  }, r.action, " ", /*#__PURE__*/React.createElement("i", {
    className: "ph ph-arrow-right"
  })))))));
}
Object.assign(window, {
  StatCards,
  QuickLinks,
  RecentRequests
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DashSections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/inspection-booking/BookingModal.jsx
try { (() => {
// Booking modal — Buy & Rent Cars house style (light, navy/orange, Manrope/Lexend, Phosphor).
// Uses design-system components from the bundle; mock data lives in index.html.
const {
  Button,
  Select,
  Card
} = window.BuyRentCarsDesignSystem_a58654;
const STEPS = ['Location', 'Center', 'Date & time', 'Confirm'];
function StepDot({
  index,
  current
}) {
  const step = index + 1;
  const done = current > step;
  const active = current === step;
  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 100,
    padding: '8px 14px 8px 8px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 700,
    transition: 'all .18s ease',
    border: '1px solid transparent',
    whiteSpace: 'nowrap'
  };
  const skin = active ? {
    background: 'var(--brand-navy)',
    color: 'var(--white)',
    borderColor: 'var(--brand-navy)'
  } : done ? {
    background: 'var(--success-bg)',
    color: 'var(--success)',
    borderColor: 'transparent'
  } : {
    background: 'var(--surface-muted)',
    color: 'var(--ink-500)',
    borderColor: 'var(--line-200)'
  };
  const dot = active ? {
    background: 'var(--white)',
    color: 'var(--brand-navy)'
  } : done ? {
    background: 'var(--success)',
    color: 'var(--white)'
  } : {
    background: 'var(--ink-300)',
    color: 'var(--white)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...base,
      ...skin
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 100,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 800,
      ...dot
    }
  }, done ? /*#__PURE__*/React.createElement("i", {
    className: "ph-bold ph-check",
    style: {
      fontSize: 12
    }
  }) : step), STEPS[index]);
}
function IconSquare({
  icon,
  tone = 'navy',
  size = 40
}) {
  const tones = {
    navy: {
      bg: 'var(--brand-navy-soft)',
      fg: 'var(--brand-navy)'
    },
    orange: {
      bg: 'var(--peach-bg)',
      fg: 'var(--brand-orange-2)'
    },
    green: {
      bg: 'var(--success-bg)',
      fg: 'var(--success)'
    },
    muted: {
      bg: 'var(--surface-muted)',
      fg: 'var(--ink-700)'
    }
  };
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 10,
      background: t.bg,
      color: t.fg,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: Math.round(size * 0.46)
    }
  }));
}
function SelectableCard({
  selected,
  onSelect,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSelect,
    style: {
      textAlign: 'left',
      cursor: 'pointer',
      borderRadius: 12,
      padding: 16,
      background: selected ? 'var(--brand-navy-soft)' : 'var(--white)',
      border: `1px solid ${selected ? 'var(--brand-navy)' : 'var(--line-200)'}`,
      boxShadow: selected ? 'none' : 'var(--shadow-xs)',
      transition: 'all .15s ease',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, children);
}
function SummaryRow({
  icon,
  tone,
  label,
  value,
  placeholder
}) {
  const set = value != null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconSquare, {
    icon: icon,
    tone: set ? tone : 'muted'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
      color: 'var(--ink-500)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: set ? 'var(--ink-900)' : 'var(--ink-400)',
      lineHeight: 1.4
    }
  }, set ? value : placeholder)));
}
function MiniCalendar({
  available,
  selected,
  onSelect
}) {
  const [view] = React.useState(() => {
    const d = new Date();
    return {
      y: d.getFullYear(),
      m: d.getMonth()
    };
  });
  const first = new Date(view.y, view.m, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon-first
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const monthName = first.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const iso = d => `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 100,
      border: '1px solid var(--line-200)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-left"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 18,
      fontWeight: 800,
      color: 'var(--ink-900)'
    }
  }, monthName), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 100,
      border: '1px solid var(--line-200)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-right"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      gap: 4
    }
  }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      textAlign: 'center',
      fontSize: 11,
      fontWeight: 800,
      color: 'var(--ink-400)',
      padding: '4px 0'
    }
  }, d)), cells.map((d, i) => {
    if (!d) return /*#__PURE__*/React.createElement("span", {
      key: i
    });
    const key = iso(d);
    const isAvail = available.has(key);
    const isSel = selected === key;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      disabled: !isAvail,
      onClick: () => onSelect(key),
      style: {
        aspectRatio: '1',
        borderRadius: 8,
        border: 'none',
        cursor: isAvail ? 'pointer' : 'default',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        background: isSel ? 'var(--brand-navy)' : isAvail ? 'var(--brand-navy-soft)' : 'transparent',
        color: isSel ? 'var(--white)' : isAvail ? 'var(--brand-navy)' : 'var(--ink-300)',
        transition: 'all .12s ease'
      }
    }, d);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      borderTop: '1px solid var(--line-200)',
      paddingTop: 12,
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 100,
      background: 'var(--brand-navy-soft)',
      border: '1px solid var(--brand-navy)'
    }
  }), " Available"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 100,
      background: 'var(--surface-muted)'
    }
  }), " Unavailable")));
}
function EmptyState({
  icon,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 220,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      textAlign: 'center',
      border: '1px dashed var(--line-200)',
      borderRadius: 12,
      background: 'var(--surface-muted)',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(IconSquare, {
    icon: icon,
    tone: "muted",
    size: 48
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--ink-900)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginTop: 4
    }
  }, sub)));
}
function BookingModal({
  data,
  carTitle = 'Lexus NX 300h',
  onClose = () => {}
}) {
  const [step, setStep] = React.useState(1);
  const [country, setCountry] = React.useState('');
  const [state, setState] = React.useState('');
  const [city, setCity] = React.useState('');
  const [center, setCenter] = React.useState(null);
  const [date, setDate] = React.useState('');
  const [slot, setSlot] = React.useState(null);
  const states = (data.locations.find(l => l.country === country) || {}).states || [];
  const cities = (states.find(s => s.state === state) || {}).cities || [];
  const centers = city ? data.centers : [];
  const availableDates = new Set(Object.keys(data.slots));
  const daySlots = date ? data.slots[date] || [] : [];
  const headings = [['Select a location', 'Pick the country, state, and city closest to you.'], ['Select an inspection center', 'These centers serve your selected city.'], ['Select a visit date and time', date ? new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Only dates with openings are selectable.'], ['Confirm your appointment', 'Review the details below, then confirm.']];
  const back = () => setStep(s => Math.max(1, s - 1));
  const timeLabel = slot ? `${slot.start} – ${slot.end}` : null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 940,
      maxWidth: '96vw',
      maxHeight: '92vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--white)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 40px 120px rgba(0,0,83,0.35)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--white)',
      borderBottom: '1px solid var(--line-200)',
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(IconSquare, {
    icon: "shield-check",
    tone: "navy",
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: 'var(--brand-orange-2)'
    }
  }, "Vehicle Inspection"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      fontWeight: 800,
      color: 'var(--ink-900)',
      margin: '2px 0 4px'
    }
  }, "Book an inspection"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--ink-500)',
      margin: 0,
      maxWidth: 620
    }
  }, "Choose a center and an available visit window. Attend your inspection at the selected center \u2014 no further confirmation needed.")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      width: 36,
      height: 36,
      borderRadius: 100,
      border: '1px solid var(--line-200)',
      background: 'var(--white)',
      color: 'var(--ink-700)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-x"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 20,
      flexWrap: 'wrap'
    }
  }, STEPS.map((_, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement(StepDot, {
    index: i,
    current: step
  }), i < STEPS.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 1,
      background: 'var(--line-200)'
    }
  }))), step === 3 && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      background: 'var(--peach-bg)',
      color: 'var(--brand-orange-2)',
      borderRadius: 100,
      padding: '6px 14px',
      fontSize: 12,
      fontWeight: 700
    }
  }, availableDates.size, " available dates"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      flex: 1,
      minHeight: 0,
      background: 'var(--surface-muted)'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 24,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--white)',
      border: '1px solid var(--line-200)',
      borderRadius: 16,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 18,
      fontWeight: 800,
      color: 'var(--ink-900)',
      margin: 0
    }
  }, headings[step - 1][0]), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--ink-500)',
      margin: '4px 0 0'
    }
  }, headings[step - 1][1])), step > 1 && /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-arrow-left"
    }),
    onClick: back
  }, "Back")), step === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Country",
    placeholder: "Select country",
    value: country,
    options: data.locations.map(l => l.country),
    onChange: e => {
      setCountry(e.target.value);
      setState('');
      setCity('');
    }
  }), /*#__PURE__*/React.createElement(Select, {
    label: "State",
    placeholder: "Select state",
    value: state,
    options: states.map(s => s.state),
    onChange: e => {
      setState(e.target.value);
      setCity('');
    },
    disabled: !country
  }), /*#__PURE__*/React.createElement(Select, {
    label: "City",
    placeholder: "Select city",
    value: city,
    options: cities,
    onChange: e => setCity(e.target.value),
    disabled: !state
  })), step === 2 && (centers.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "buildings",
    title: "No centers in this city",
    sub: "Go back and pick another location."
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 12
    }
  }, centers.map(c => /*#__PURE__*/React.createElement(SelectableCard, {
    key: c.id,
    selected: center && center.id === c.id,
    onSelect: () => {
      setCenter(c);
      setDate('');
      setSlot(null);
      setStep(3);
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IconSquare, {
    icon: "buildings",
    tone: center && center.id === c.id ? 'navy' : 'muted',
    size: 32
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: 'var(--ink-900)'
    }
  }, c.company_name)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      lineHeight: 1.5,
      color: 'var(--ink-500)'
    }
  }, c.address), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 'fit-content',
      alignItems: 'center',
      gap: 4,
      background: 'var(--surface-muted)',
      color: 'var(--ink-700)',
      borderRadius: 100,
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-map-pin"
  }), " ", c.city))))), step === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 340,
      flexShrink: 0,
      background: 'var(--surface-muted)',
      border: '1px solid var(--line-200)',
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(MiniCalendar, {
    available: availableDates,
    selected: date,
    onSelect: d => {
      setDate(d);
      setSlot(null);
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220
    }
  }, !date ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "calendar-blank",
    title: "Pick a date to see time windows"
  }) : daySlots.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "clock",
    title: "No openings on this date",
    sub: "Pick another available day."
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 12
    }
  }, daySlots.map(s => {
    const full = s.spots === 0;
    const sel = slot && slot.id === s.id;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      type: "button",
      disabled: full,
      onClick: () => setSlot(s),
      style: {
        textAlign: 'left',
        cursor: full ? 'not-allowed' : 'pointer',
        opacity: full ? 0.5 : 1,
        borderRadius: 12,
        padding: 14,
        minHeight: 92,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: sel ? 'var(--brand-navy-soft)' : 'var(--white)',
        border: `1px solid ${sel ? 'var(--brand-navy)' : 'var(--line-200)'}`,
        fontFamily: 'inherit',
        transition: 'all .15s ease'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(IconSquare, {
      icon: "clock",
      tone: sel ? 'navy' : 'muted',
      size: 32
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 800,
        color: 'var(--ink-900)'
      }
    }, s.start, " \u2013 ", s.end)), /*#__PURE__*/React.createElement("span", {
      style: {
        marginTop: 12,
        width: 'fit-content',
        borderRadius: 100,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        background: full ? 'var(--surface-muted)' : 'var(--success-bg)',
        color: full ? 'var(--ink-500)' : 'var(--success)'
      }
    }, full ? 'Full' : `${s.spots} spot${s.spots === 1 ? '' : 's'} left`));
  })))), step === 4 && slot && center && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--line-200)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--line-200)',
      paddingBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
      color: 'var(--ink-500)'
    }
  }, "Vehicle"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: 'var(--ink-900)'
    }
  }, carTitle)), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "map-pin",
    tone: "green",
    label: "Center",
    value: center.company_name
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "calendar-blank",
    tone: "navy",
    label: "Date",
    value: new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "clock",
    tone: "orange",
    label: "Time",
    value: timeLabel
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 12,
      background: 'var(--brand-navy-soft)',
      border: '1px solid var(--brand-navy)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: 'var(--brand-navy)'
    }
  }, "What happens next"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      color: 'var(--brand-navy-deep)',
      margin: '4px 0 0'
    }
  }, "Your appointment is confirmed immediately. Attend your inspection at the selected center on the date and time above."))))), /*#__PURE__*/React.createElement("aside", {
    style: {
      borderLeft: '1px solid var(--line-200)',
      background: 'var(--white)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--ink-500)',
      marginBottom: 16
    }
  }, "Appointment summary"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "map-pin",
    tone: "green",
    label: "Center",
    value: center ? center.company_name : null,
    placeholder: "Choose a center"
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "calendar-blank",
    tone: "navy",
    label: "Date",
    value: date ? new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : null,
    placeholder: "Choose a date"
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    icon: "clock",
    tone: "orange",
    label: "Time",
    value: timeLabel,
    placeholder: "Choose a time"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 12,
      background: 'var(--peach-bg)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: 'var(--brand-orange-2)'
    }
  }, "What happens next"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      color: 'var(--ink-700)',
      margin: '4px 0 0'
    }
  }, "Your appointment is confirmed immediately. Attend your inspection at the selected center.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--line-200)',
      background: 'var(--white)',
      padding: '16px 28px',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12
    }
  }, step > 1 && /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-arrow-left"
    }),
    onClick: back
  }, "Back"), step === 1 && /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: !city,
    onClick: () => setStep(2)
  }, "Choose center"), step === 3 && /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: !slot,
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-clock"
    }),
    onClick: () => setStep(4)
  }, "Review appointment"), step === 4 && /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-check-circle"
    }),
    onClick: onClose
  }, "Book appointment")));
}
window.BookingModal = BookingModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/inspection-booking/BookingModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Footer.jsx
try { (() => {
const {
  SocialIcon
} = window.BuyRentCarsDesignSystem_a58654;
function Footer() {
  const col = (title, items) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--white)'
    }
  }, title), items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      fontSize: 14,
      color: 'rgb(232,233,233)',
      textDecoration: 'none'
    }
  }, it)));
  const contact = [['envelope', 'info@buyandrentcars.com'], ['envelope', 'buyandrentcars@gmail.com'], ['phone', '+2348123456789']];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--white)',
      padding: '64px 100px 32px',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 104,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 308,
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "Buy & Rent Cars",
    style: {
      height: 52,
      width: 170,
      objectFit: 'cover',
      objectPosition: 'left'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.4,
      color: 'rgb(232,233,233)'
    }
  }, "Your trusted partner for seamless car rentals. Connecting car owners with customers for the perfect ride.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, ['linkedin', 'instagram', 'facebook', 'x', 'whatsapp'].map(p => /*#__PURE__*/React.createElement(SocialIcon, {
    key: p,
    platform: p,
    variant: "onDark",
    size: 24
  })))), col('Quick Links', ['Home', 'About Us', 'Contact Us']), col('Services', ['Rent Cars', 'Buy Cars', 'Sell Cars']), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, "Contact"), contact.map(([ic, txt]) => /*#__PURE__*/React.createElement("span", {
    key: txt,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 14,
      color: 'rgb(232,233,233)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 4,
      background: 'var(--brand-navy)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + ic,
    style: {
      fontSize: 13
    }
  })), txt)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 48,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,.12)',
      fontSize: 14,
      color: 'rgb(232,233,233)',
      flexWrap: 'wrap',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", null, "Buy & Rent Cars \xA9 2025 All rights reserved."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'rgb(232,233,233)',
      textDecoration: 'none'
    }
  }, "Privacy Policy"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'rgb(232,233,233)',
      textDecoration: 'none'
    }
  }, "Terms of Service"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'rgb(232,233,233)',
      textDecoration: 'none'
    }
  }, "Cookie Policy"))));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Header.jsx
try { (() => {
const {
  Button
} = window.BuyRentCarsDesignSystem_a58654;
function Header({
  loggedIn = false,
  onNav = () => {},
  onSignIn = () => {},
  active = 'home'
}) {
  const links = [{
    id: 'about',
    label: 'About Us'
  }, {
    id: 'services',
    label: 'Services',
    caret: true
  }, {
    id: 'contact',
    label: 'Contact Us'
  }];
  if (loggedIn) links.push({
    id: 'dashboard',
    label: 'Dashboard'
  });
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 88,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 100px',
      borderBottom: '1px solid var(--line-200)',
      background: 'var(--white)',
      position: 'sticky',
      top: 0,
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "Buy & Rent Cars",
    style: {
      height: 44
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 40
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.id,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav(l.id);
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      fontWeight: active === l.id ? 700 : 500,
      color: active === l.id ? 'var(--brand-navy)' : 'var(--ink-900)',
      textDecoration: 'none'
    }
  }, l.label, l.caret && /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-down",
    style: {
      fontSize: 14
    }
  })))), loggedIn ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      color: 'var(--ink-900)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-bell",
    style: {
      fontSize: 22,
      position: 'relative',
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-user",
    style: {
      fontSize: 22,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-sign-out",
    style: {
      fontSize: 22,
      cursor: 'pointer'
    },
    onClick: () => onNav('signout')
  })) : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-user"
    }),
    onClick: onSignIn
  }, "Sign Up"));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Hero.jsx
try { (() => {
const {
  Button,
  Select
} = window.BuyRentCarsDesignSystem_a58654;
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '72px 100px',
      background: 'var(--white)',
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 16,
      background: 'var(--white)',
      border: '1px solid var(--line-200)',
      borderRadius: 16,
      padding: 16,
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 220
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--ink-700)'
    }
  }, "Location"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 48,
      padding: '0 16px',
      border: '1px solid var(--line-200)',
      borderRadius: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-map-pin",
    style: {
      color: 'var(--ink-500)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Enter city",
    style: {
      border: 'none',
      outline: 'none',
      fontFamily: 'inherit',
      fontSize: 14,
      width: '100%'
    }
  }))), /*#__PURE__*/React.createElement(Select, {
    label: "Car Type",
    options: ['Sedan', 'SUV', 'Truck', 'Coupe'],
    style: {
      width: 200
    }
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Price Range (\u20A6)",
    options: ['< ₦20,000', '₦20k–₦50k', '> ₦50,000'],
    style: {
      width: 200
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    startIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-magnifying-glass"
    }),
    style: {
      height: 48
    }
  }, "Search"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-muted)',
      padding: '64px 100px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--peach-bg)',
      color: 'var(--brand-orange-2)',
      borderRadius: 100,
      padding: '6px 14px',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-car"
  }), " About Us"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 48,
      fontWeight: 800,
      lineHeight: 1.1,
      color: 'var(--ink-900)',
      margin: '20px 0 0',
      maxWidth: 520
    }
  }, "We Make Car Ownership and Rentals Effortless"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.4,
      color: 'var(--ink-700)',
      maxWidth: 460,
      margin: '16px 0 24px'
    }
  }, "Buy & Rent Cars is a trusted platform built to make renting, buying, and selling cars simple and stress-free for everyone in Nigeria. We connect everyday users with verified car owners and dealers, giving you access to a wide range of cars."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    endIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-arrow-right"
    })
  }, "Learn More")));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Listings.jsx
try { (() => {
const {
  CarCard,
  Button
} = window.BuyRentCarsDesignSystem_a58654;
const IMG = '../../assets/car-lexus.png';
const ROWS = [{
  label: 'MOST RENTED CARS',
  suffix: '/day',
  cta: 'Rent Now',
  prices: ['₦35,000', '₦35,000', '₦35,000', '₦35,000']
}, {
  label: 'MOST PURCHASED CARS',
  suffix: '',
  cta: 'Buy Now',
  prices: ['₦20,000,000', '₦54,000,000', '₦13,000,000', '₦22,000,000']
}, {
  label: 'MOST LISTED CARS',
  suffix: '/day',
  cta: 'Rent Now',
  prices: ['₦35,000', '₦35,000', '₦35,000', '₦35,000']
}];
function Listings() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--white)',
      padding: '72px 100px',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--brand-navy-soft)',
      color: 'var(--brand-navy)',
      borderRadius: 100,
      padding: '6px 14px',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-steering-wheel"
  }), " Our Services"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: 'var(--ink-900)',
      margin: '16px 0 8px'
    }
  }, "Find the Perfect Car for Every Journey"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--ink-500)',
      margin: 0
    }
  }, "Choose from our premium collection of vehicles for rent, buy, or sell.")), ROWS.map(row => /*#__PURE__*/React.createElement("div", {
    key: row.label,
    style: {
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.06em',
      color: 'var(--ink-500)'
    }
  }, row.label), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    endIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-arrow-right"
    })
  }, "See More")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 24
    }
  }, row.prices.map((p, i) => /*#__PURE__*/React.createElement(CarCard, {
    key: i,
    image: IMG,
    title: "Lexus NX 300h",
    bodyType: "Sedan",
    location: "Lagos, Nigeria",
    price: p,
    priceSuffix: row.suffix,
    rating: 4,
    ctaLabel: row.cta,
    width: "100%"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      marginTop: 32,
      background: 'repeating-linear-gradient(90deg, var(--ink-900) 0 24px, transparent 24px 44px)'
    }
  }))));
}
window.Listings = Listings;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Listings.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Sections.jsx
try { (() => {
const {
  Button,
  StarRating
} = window.BuyRentCarsDesignSystem_a58654;
function Testimonials() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-muted)',
      padding: '72px 100px',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      maxWidth: 260
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--peach-bg)',
      color: 'var(--brand-orange-2)',
      borderRadius: 100,
      padding: '6px 14px',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-chat-circle"
  }), " Testimonials"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: 'var(--ink-900)',
      margin: '16px 0 0'
    }
  }, "Client's Success Stories")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'var(--surface-dark)',
      borderRadius: 24,
      padding: 40,
      color: 'var(--white)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      transform: 'perspective(600px) rotateX(45deg)',
      transformOrigin: 'top'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      gap: 24
    }
  }, [['John Adewara', 'Civil Engineer', 'I rented a car for a weekend trip through Buy & Rent Cars, and it was seamless from start to finish. The car was clean, the process was fast, and the price was just right. I\u2019ll definitely rent again.']].map(([n, r, q]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      background: 'var(--white)',
      color: 'var(--ink-900)',
      borderRadius: 16,
      padding: 24,
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement(StarRating, {
    value: 5,
    size: 16
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      marginTop: 12
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, r), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--ink-700)',
      marginBottom: 0
    }
  }, q)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      gap: 8,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,.3)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-left"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,.3)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-right"
  })))));
}
const FAQS = ['What is Buy and Rent Cars and how does it work?', 'How do I rent a car on Buy and Rent Cars?', 'Can I list my personal car for rent?', 'Is there any verification process for owners and renters?', 'What happens if a car gets damaged during a rental?', 'Do you offer long-term or corporate rentals?', 'When will the \u2018Buy\u2019 and \u2018Sell\u2019 features be available?', 'Is Buy and Rent available on mobile?'];
function Faq() {
  const [open, setOpen] = React.useState(0);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--white)',
      padding: '72px 100px',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--brand-navy-soft)',
      color: 'var(--brand-navy)',
      borderRadius: 100,
      padding: '6px 14px',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-question"
  }), " FAQs"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      margin: '16px 0 8px'
    }
  }, "Frequently Asked Questions"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--ink-500)',
      margin: 0
    }
  }, "Find answers to common questions about our services.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      maxWidth: 1000,
      margin: '0 auto'
    }
  }, FAQS.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => setOpen(open === i ? -1 : i),
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 12,
      padding: '16px 20px',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--ink-900)'
    }
  }, q), /*#__PURE__*/React.createElement("i", {
    className: 'ph ph-caret-' + (open === i ? 'up' : 'down'),
    style: {
      color: 'var(--ink-500)'
    }
  })), open === i && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      color: 'var(--ink-700)',
      margin: '12px 0 0'
    }
  }, "Our team verifies every listing and user. Reach out to support any time for details specific to your rental or purchase.")))));
}
function Loyalty() {
  const perks = [['gift', 'Earn Points on Every Rental', 'Accumulate points each time you book, buy or list a car with us.'], ['crown', 'Unlock Premium Benefits', 'Access free upgrades, priority support and exclusive partner offers.'], ['clock-counter-clockwise', 'Redeem Anytime', 'Turn your points into discounts on future rentals and purchases.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--white)',
      padding: '0 100px 72px',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--ink-400)',
      maxWidth: 360
    }
  }, "Loyalty that rewards your journey \u2014 the road to more with every trip."), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    endIcon: /*#__PURE__*/React.createElement("i", {
      className: "ph ph-arrow-right"
    })
  }, "Browse Cars")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'var(--brand-orange-deep)',
      borderRadius: 24,
      padding: 40,
      color: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 24,
      fontWeight: 700,
      margin: '0 0 8px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-gift"
  }), " Loyalty Rewards Program"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      opacity: .9,
      margin: '0 0 24px'
    }
  }, "Join our reward program and unlock amazing perks that make every journey more rewarding."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, perks.map(([ic, t, d]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 100,
      background: 'rgba(255,255,255,.18)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + ic
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: .85
    }
  }, d))))), /*#__PURE__*/React.createElement("button", {
    style: {
      marginTop: 24,
      width: '100%',
      height: 48,
      borderRadius: 8,
      border: 'none',
      background: 'var(--white)',
      color: 'var(--brand-orange-deep)',
      fontFamily: 'inherit',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, "Join the Program ", /*#__PURE__*/React.createElement("i", {
    className: "ph ph-arrow-right"
  })))));
}
Object.assign(window, {
  Testimonials,
  Faq,
  Loyalty
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.SocialIcon = __ds_scope.SocialIcon;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.CarCard = __ds_scope.CarCard;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ContactCard = __ds_scope.ContactCard;

__ds_ns.RequestCard = __ds_scope.RequestCard;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.StarRating = __ds_scope.StarRating;

__ds_ns.Testimonial = __ds_scope.Testimonial;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Breadcrumbs = __ds_scope.Breadcrumbs;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.NavLink = __ds_scope.NavLink;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

})();
