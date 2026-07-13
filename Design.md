# Design.md

# 🎨 Design System – Soft Horizon

> A calm, premium, minimal design language inspired by pastel sunsets, soft shadows, rounded surfaces, and emotional warmth.

---

# Design Philosophy

This design language focuses on making productivity feel relaxing instead of stressful.

Unlike traditional productivity apps that rely on dark colors, aggressive reds, or sharp interfaces, this system creates an environment where users naturally want to stay focused.

Design Principles

- Soft over Sharp
- Calm over Loud
- Friendly over Corporate
- Spacious over Crowded
- Emotional over Mechanical

Everything should feel:

- Floating
- Rounded
- Airy
- Comfortable
- Modern

---

# Color Palette

## Primary Colors

| Name | Hex |
|------|------|
| Sage Mist | `#9EABA2` |
| Morning Mint | `#BDD1C5` |
| Butter Cream | `#EECC8C` |
| Peach Glow | `#EBB288` |
| Dusty Rose | `#D3A29D` |
| Terracotta | `#A36361` |

---

## Neutral Colors

| Name | Hex |
|------|------|
| Soft White | `#FAFAF7` |
| Warm Gray | `#ECE8E3` |
| Light Stone | `#D8D8D3` |
| Text Primary | `#4D4D4D` |
| Text Secondary | `#757575` |
| Border | `#E8E4DE` |

---

# Gradient System

## Primary Gradient

Top

```
#D3A29D
```

↓

Middle

```
#EBB288
```

↓

Bottom

```
#BDD1C5
```

---

## Warm Gradient

```
#EECC8C
→
#EBB288
```

Used for

- Buttons
- CTA
- Highlights

---

## Calm Gradient

```
#BDD1C5
→
#9EABA2
```

Used for

- Cards
- Dashboard
- Empty states

---

# Typography

## Font

Recommended

- Manrope
- SF Pro Display
- Inter

---

## Font Weights

Heading

700

Sub Heading

600

Body

400

Caption

500

---

# Border Radius

Large Cards

```
32px
```

Buttons

```
20px
```

Small Cards

```
24px
```

Input Fields

```
18px
```

Floating Action Button

```
100px
```

---

# Shadows

Soft Shadow

```css
0px 15px 40px rgba(90,90,90,0.10)
```

Hover Shadow

```css
0px 20px 50px rgba(90,90,90,0.15)
```

Floating Shadow

```css
0px 30px 70px rgba(90,90,90,0.18)
```

No hard shadows.

Never use pure black shadows.

---

# Blur

Glass Blur

```
20px
```

Modal Blur

```
30px
```

Background Blur

```
40px
```

---

# Components

## Cards

- Large rounded corners
- Soft shadow
- Slight elevation
- Pastel background
- Spacious padding

---

## Buttons

Primary

Background

```
#A36361
```

Text

```
White
```

Radius

```
20px
```

Hover

Slight lift

```
translateY(-2px)
```

---

Secondary

Background

```
#BDD1C5
```

Text

```
#4D4D4D
```

---

Ghost Button

Transparent

Border

```
1px #D8D8D3
```

---

# Inputs

Background

```
#FAFAF7
```

Border

```
#ECE8E3
```

Focus

```
#A36361
```

Radius

```
18px
```

---

# Icons

Style

Rounded

Stroke Width

2px

Preferred Libraries

- Lucide
- Phosphor
- Material Symbols Rounded

---

# Spacing System

```
4
8
12
16
24
32
48
64
80
96
```

Always use multiples of 8.

---

# Animations

Duration

Fast

```
150ms
```

Normal

```
250ms
```

Slow

```
400ms
```

Curve

```
easeOutCubic
```

Animations

- Fade
- Scale
- Slide
- Floating
- Soft Bounce

Never use aggressive animations.

---

# Backgrounds

Main Background

Gradient

```
#D3A29D
↓

#EBB288
↓

#BDD1C5
```

Cards

```
#FAFAF7
```

Secondary Surface

```
#ECE8E3
```

---

# Illustrations

Style

- Soft
- Rounded
- Minimal
- Pastel
- Friendly
- Slightly abstract

Avoid

- Neon
- Harsh outlines
- Comic style
- Flat corporate illustrations

---

# UI Personality

The interface should feel like

- A peaceful Sunday morning
- A warm cup of coffee
- A clean notebook
- A quiet workspace
- A relaxing sunset

Users should feel calm, welcomed, and focused the moment they open the app.

---

# Accessibility

Minimum Text Contrast

4.5:1

Touch Targets

Minimum

```
48x48dp
```

Support

- Light Mode
- Dark Mode
- Dynamic Font Scaling

---

# Overall Style Keywords

- Premium
- Minimal
- Pastel
- Soft
- Floating
- Organic
- Friendly
- Emotional
- Elegant
- Calm
- Modern
- Airy
- Rounded
- Warm