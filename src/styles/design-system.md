# Voicely Design System

## Brand Colors (from voicely.co.il)

### Primary Palette
| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Purple (Primary)** | `#391E59` | `270 50% 23%` | Headers, primary buttons, navigation |
| **Coral (Accent)** | `#ED4A69` | `350 82% 61%` | CTAs, highlights, notifications |
| **Red** | `#E8424D` | `356 79% 58%` | Errors, destructive actions, urgent |

### Neutral Palette
| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Charcoal** | `#111111` | `0 0% 7%` | Primary text |
| **Gray 700** | `#374151` | `215 19% 27%` | Secondary text |
| **Gray 500** | `#6B7280` | `220 9% 46%` | Muted text, placeholders |
| **Gray 300** | `#D1D5DB` | `216 12% 84%` | Borders, dividers |
| **Gray 100** | `#F3F4F6` | `220 14% 96%` | Backgrounds, cards |
| **White** | `#FFFFFF` | `0 0% 100%` | Page background, card background |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#10B981` | Success states, completed |
| **Warning** | `#F59E0B` | Warnings, pending |
| **Error** | `#EF4444` | Errors, failures |
| **Info** | `#3B82F6` | Information, links |

### Gradients
```css
/* Primary Gradient - Purple to Coral (like voicely.co.il hero) */
--gradient-brand: linear-gradient(135deg, #391E59 0%, #ED4A69 100%);

/* Soft Purple Gradient - for cards/badges */
--gradient-purple: linear-gradient(135deg, #391E59 0%, #5B3A7A 100%);

/* Coral Gradient - for CTAs */
--gradient-coral: linear-gradient(135deg, #ED4A69 0%, #F97316 100%);
```

---

## Typography

### Font Family
```css
font-family: 'Assistant', sans-serif;
```

### Scale (Mobile First)
| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 1.5 | Captions, badges |
| `text-sm` | 14px | 400 | 1.5 | Secondary text, labels |
| `text-base` | 16px | 400 | 1.5 | Body text |
| `text-lg` | 18px | 500 | 1.4 | Subheadings |
| `text-xl` | 20px | 600 | 1.3 | Card titles |
| `text-2xl` | 24px | 700 | 1.2 | Section headers |
| `text-3xl` | 30px | 700 | 1.2 | Page titles |
| `text-4xl` | 36px | 800 | 1.1 | Hero titles |

### Text Color Rules
| Context | Class | Color |
|---------|-------|-------|
| Primary text | `text-foreground` | Charcoal (#111) |
| Secondary text | `text-muted-foreground` | Gray 500 |
| On dark background | `text-white` | White |
| On primary (purple) | `text-white` | White |
| On accent (coral) | `text-white` | White |
| Links | `text-primary` | Purple |
| Section headers | `text-foreground` | Charcoal |

---

## Component Patterns

### Cards
```tsx
// Standard Card
<Card className="bg-card border border-border rounded-xl shadow-sm">
  <CardHeader>
    <CardTitle className="text-foreground">Title</CardTitle>
    <CardDescription className="text-muted-foreground">Description</CardDescription>
  </CardHeader>
</Card>

// Gradient Header Card
<Card className="overflow-hidden">
  <div className="bg-gradient-brand p-4">
    <h3 className="text-white font-bold">Title on Gradient</h3>
    <p className="text-white/80">Subtitle</p>
  </div>
  <CardContent className="bg-card">
    {/* Content */}
  </CardContent>
</Card>
```

### Buttons
```tsx
// Primary Button
<Button className="bg-primary text-white hover:bg-primary/90">
  Primary Action
</Button>

// Secondary Button
<Button variant="secondary" className="bg-secondary text-secondary-foreground">
  Secondary
</Button>

// Gradient Button (CTA)
<Button className="bg-gradient-brand text-white hover:opacity-90">
  Call to Action
</Button>

// Outline Button
<Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
  Outline
</Button>
```

### Section Headers
```tsx
// Page Header
<h1 className="text-3xl font-bold text-foreground">Page Title</h1>

// Section Header with Icon
<div className="flex items-center gap-2">
  <Icon className="w-5 h-5 text-primary" />
  <h2 className="text-xl font-semibold text-foreground">Section Title</h2>
</div>

// Muted Section Header
<h3 className="text-lg font-medium text-muted-foreground">Subsection</h3>
```

### Stats/Metrics
```tsx
// Stat Card
<div className="bg-card rounded-xl border p-4 text-center">
  <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
  <div className="text-2xl font-bold text-foreground">1,234</div>
  <div className="text-sm text-muted-foreground">Label</div>
</div>
```

---

## Spacing Scale

| Name | Value | Usage |
|------|-------|-------|
| `gap-1` | 4px | Tight spacing (icons) |
| `gap-2` | 8px | Compact spacing |
| `gap-3` | 12px | Default spacing |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Large spacing |
| `gap-8` | 32px | Section dividers |

---

## Border Radius

| Name | Value | Usage |
|------|-------|-------|
| `rounded-md` | 6px | Small elements, badges |
| `rounded-lg` | 8px | Buttons, inputs |
| `rounded-xl` | 12px | Cards |
| `rounded-2xl` | 16px | Large cards, modals |
| `rounded-full` | 50% | Avatars, pills |

---

## Shadows

```css
/* Card shadow */
.shadow-card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
}

/* Elevated shadow */
.shadow-elevated {
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
}

/* Modal shadow */
.shadow-modal {
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}
```

---

## Do's and Don'ts

### DO
- Use `text-foreground` for primary text on light backgrounds
- Use `text-white` on purple/coral backgrounds
- Use `text-muted-foreground` for secondary/helper text
- Use gradients for hero sections and CTAs
- Keep contrast ratio above 4.5:1 for accessibility

### DON'T
- Don't use light purple text on white backgrounds
- Don't use purple text on coral backgrounds
- Don't mix green and purple themes
- Don't use gray text on gray backgrounds
- Don't create new colors outside this palette
