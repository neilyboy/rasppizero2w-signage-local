# 📺 PiSign — Raspberry Pi Zero 2W Digital Signage

<div align="center">

![PiSign](https://img.shields.io/badge/PiSign-Digital_Signage-3b82f6?style=for-the-badge&logo=raspberry-pi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-App_Router-black?style=for-the-badge&logo=next.js)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v3-Styling-06b6d4?style=for-the-badge&logo=tailwindcss)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A full-featured, locally-hosted digital signage control system for the Raspberry Pi Zero 2W.**  
Plug your Pi into a TV, connect to your WiFi, and control everything from any phone or laptop on the network — no cloud required.

[🚀 Quick Deploy](#-quick-deploy-from-scratch) · [✨ Features](#-features) · [📖 Full Setup Guide](#-full-pi-zero-2w-setup-guide) · [🛠 Development](#-local-development)

</div>

---

## ✨ Features

### 🖥️ Admin Panel (`/admin`)

| Page | What it does |
|---|---|
| **Dashboard** | Live Pi hardware stats (CPU temp, RAM, disk, uptime), content summary, real-time clock, quick-action shortcuts |
| **Media Library** | Drag-and-drop upload for images & videos, add web URLs, text/announcement slides, stat widgets — all with tag filtering and inline preview |
| **Playlists** | Build ordered playlists, drag-to-reorder items, per-item duration override, loop & shuffle toggles, thumbnail strip preview |
| **Schedule** | Full calendar (month/week/day/agenda), click-to-create events, one-time & recurring (daily, weekdays, weekends, custom days), 8 color options |
| **Stats & Charts** | Bar, line, area, pie, gauge, countdown timer, number KPI, data table — CSV data entry with **live preview**, 7 color schemes |
| **Announcements** | Scrolling ticker overlay with full color/font/size/priority controls, scheduled start & end times, live preview |
| **Display Control** | Mode switcher (playlist / asset / idle), brightness slider, transition effects (fade, slide, zoom), clock overlay toggle, ticker speed |
| **Analytics** | Events over time (line chart), event breakdown (bar chart), top assets by play count, summary table — 1/7/14/30 day range |
| **Settings** | Full Pi Zero 2W setup guide with copy-paste commands, PM2 auto-start, Chromium kiosk mode, danger zone (bulk delete) |

### 📺 Display View (`/display`)

- **Full-screen TV output** — renders images, videos (autoplay), web iframes, text slides, all stat/chart widget types
- **Clock overlay** — always-on top-right clock with date
- **Scrolling announcement ticker** — bottom bar with custom color, font, speed, and priority ordering
- **Schedule-aware** — auto-switches active playlist/asset at the correct time without any manual intervention
- **Idle screen** — beautiful full-screen clock when no content is assigned
- **Analytics recording** — silently tracks asset plays and display views

### 📊 Stats & Charts Widget Types
- 📈 **Line Chart** — trends over time
- 📊 **Bar Chart** — comparisons, with per-bar color
- 🔵 **Area Chart** — cumulative data
- 🥧 **Pie Chart** — proportions with legend
- 🔢 **Single Number / KPI** — large-format metric display
- ⏱️ **Countdown Timer** — days/hours/mins/secs to a target date
- 🎯 **Gauge** — arc-style progress meter with configurable max
- 📋 **Data Table** — label/value rows

### 🗓️ Schedule Features
- Month, Week, Day, and Agenda calendar views
- Click empty slots to create events instantly
- Color-coded events per entry
- Recurrence: **None, Daily, Weekdays, Weekends, Weekly, Custom days**
- Assign a **playlist** or a **single asset** to any time slot
- Active/Inactive toggle per entry

---

## 🚀 Quick Deploy From Scratch

> **Flash a fresh Raspberry Pi Zero 2W → have PiSign running on your TV in ~15 minutes.**

### What you need
- Raspberry Pi Zero 2W
- MicroSD card (8GB+)
- HDMI cable + TV/monitor
- USB power supply (5V 2.5A)
- WiFi network

---

### Step 1 — Flash the OS

1. Download **[Raspberry Pi Imager](https://www.raspberrypi.com/software/)**
2. Choose **Raspberry Pi OS Lite (64-bit)** *(no desktop — we run headless + kiosk)*  
   Or **Raspberry Pi OS (64-bit)** with desktop if you want easier setup
3. Before writing, click ⚙️ **Advanced Options** and:
   - Set hostname: `pisign`
   - Enable SSH
   - Set your WiFi SSID + password
   - Set username/password (e.g. `pi` / `yourpassword`)
4. Write to SD card, insert into Pi, power on

---

### Step 2 — Connect & Update

```bash
# SSH into the Pi (give it ~60s to boot first)
ssh pi@pisign.local
# or use its IP: ssh pi@192.168.x.x

# Update everything
sudo apt update && sudo apt upgrade -y
```

---

### Step 3 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Verify
node --version   # should be v20.x.x
npm --version
```

---

### Step 4 — Increase Swap (Required for Pi Zero 2W)

The Pi Zero 2W only has 512MB RAM. The Next.js build will be **killed** without extra swap.

```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Verify — should show ~1GB swap
free -h
```

---

### Step 5 — Clone & Build PiSign

```bash
git clone https://github.com/neilyboy/rasppizero2w-signage-local.git
cd rasppizero2w-signage-local

npm install
npm run build
```

> ⏳ The first `npm run build` takes **8–12 minutes** on a Pi Zero 2W with swap — it only happens once.

---

### Step 6 — Auto-Start with PM2

```bash
# Install PM2 process manager
sudo npm install -g pm2

# Start PiSign
pm2 start npm --name pisign -- start -- -p 3000

# Save and enable auto-start on boot
pm2 startup
# (run the command it outputs with sudo)
pm2 save
```

PiSign will now **automatically restart** if it crashes and **start on every boot**.

---

### Step 7 — Set Up the TV Display (Kiosk Mode)

This launches Chromium full-screen on the HDMI output pointing at `/display`.

#### Option A — Desktop (Raspberry Pi OS with desktop)

```bash
# Install Chromium and cursor hider
sudo apt install -y chromium unclutter

# Create autostart entry
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/pisign-kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=PiSign Kiosk
Exec=chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble http://localhost:3000/display
X-GNOME-Autostart-enabled=true
EOF

# Hide the mouse cursor
echo "unclutter -idle 0 -root &" >> ~/.config/autostart/unclutter.sh
chmod +x ~/.config/autostart/unclutter.sh
```

#### Option B — Headless (Raspberry Pi OS Lite with X11)

```bash
sudo apt install -y xorg chromium unclutter openbox

# Create xinitrc
cat > ~/.xinitrc << 'EOF'
xset s off
xset s noblank
xset -dpms
unclutter -idle 0 -root &
exec chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --autoplay-policy=no-user-gesture-required http://localhost:3000/display
EOF

# Auto-start X on login (single quotes prevent variable expansion)
echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx' >> ~/.bash_profile

# Auto-login
sudo raspi-config nonint do_boot_behaviour B2
```

---

### Step 8 — Disable Screen Blanking

```bash
sudo nano /etc/lightdm/lightdm.conf
# Add/change under [Seat:*]:
# xserver-command=X -s 0 -dpms
```

Or for headless X11, add to `~/.xinitrc` (already included in Option B above):
```bash
xset s off
xset s noblank
xset -dpms
```

---

### Step 9 — Find Your Pi's IP & Open Admin

```bash
hostname -I | awk '{print $1}'
```

Then from **any device on the same WiFi**, open:

| URL | Purpose |
|---|---|
| `http://pisign.local:3000` | → redirects to admin |
| `http://pisign.local:3000/admin` | 🎛️ Admin control panel |
| `http://pisign.local:3000/display` | 📺 TV display output |
| `http://[pi-ip]:3000/admin` | (use IP if .local doesn't resolve) |

---

### Step 10 — Set a Static IP (Recommended)

```bash
sudo nano /etc/dhcpcd.conf
```
Add at the bottom:
```
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8
```
```bash
sudo reboot
```

---

## 📁 Project Structure

```
rasppizero2w-signage-local/
├── app/
│   ├── admin/
│   │   ├── analytics/page.tsx     # Usage analytics
│   │   ├── announcements/page.tsx # Ticker management
│   │   ├── display/page.tsx       # Display control
│   │   ├── media/page.tsx         # Media library
│   │   ├── playlists/page.tsx     # Playlist builder
│   │   ├── schedule/page.tsx      # Calendar scheduler
│   │   ├── settings/page.tsx      # Setup & config
│   │   ├── stats/page.tsx         # Stats/charts builder
│   │   ├── layout.tsx             # Admin sidebar layout
│   │   └── page.tsx               # Dashboard
│   ├── api/
│   │   ├── assets/[id]/route.ts
│   │   ├── assets/route.ts
│   │   ├── playlists/[id]/route.ts
│   │   ├── playlists/route.ts
│   │   ├── schedule/[id]/route.ts
│   │   ├── schedule/route.ts
│   │   ├── stats/[id]/route.ts
│   │   ├── stats/route.ts
│   │   ├── announcements/[id]/route.ts
│   │   ├── announcements/route.ts
│   │   ├── display/route.ts
│   │   ├── analytics/route.ts
│   │   ├── system/route.ts        # Pi hardware stats
│   │   └── upload/route.ts        # File upload handler
│   ├── display/page.tsx           # Full-screen TV output
│   ├── layout.tsx
│   ├── page.tsx                   # → redirects to /admin
│   └── globals.css
├── components/
│   └── Sidebar.tsx
├── lib/
│   ├── db.ts                      # SQLite schema & connection
│   ├── types.ts                   # TypeScript types
│   └── utils.ts
├── data/                          # gitignored — SQLite DB lives here
├── public/
│   └── uploads/                   # gitignored — uploaded media
├── next.config.mjs
├── tailwind.config.js
└── postcss.config.js
```

---

## 🛠 Local Development

```bash
git clone https://github.com/neilyboy/rasppizero2w-signage-local.git
cd rasppizero2w-signage-local
npm install
npm run dev
```

- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Display: [http://localhost:3000/display](http://localhost:3000/display)

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS v3 |
| Database | SQLite via `better-sqlite3` |
| Charts | Recharts |
| Calendar | react-big-calendar + date-fns |
| File Upload | Native Next.js FormData API |
| Icons | Lucide React |
| Drag & Drop | react-dropzone (media upload), HTML5 drag API (playlist reorder) |
| Process Manager | PM2 (production) |

---

## 💾 Data Storage

| Item | Location | Gitignored |
|---|---|---|
| SQLite database | `data/signage.db` | ✅ Yes |
| Uploaded media | `public/uploads/` | ✅ Yes |

Both are **auto-created on first run** — no setup needed.

---

## 🔄 Updating PiSign

```bash
cd rasppizero2w-signage-local
git pull
npm install
npm run build
pm2 restart pisign
```

---

## 🩺 Troubleshooting

**Build was `Killed` (out of memory)**
```bash
# Pi Zero 2W needs swap to build — run Step 4 first
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup && sudo dphys-swapfile swapon
# Then retry:
cd ~/rasppizero2w-signage-local && npm run build
```

**"Could not find a production build" error**
```bash
# You need to build the app on the Pi before starting it
cd ~/rasppizero2w-signage-local
npm run build   # takes 3-5 min on Pi Zero 2W
pm2 restart pisign
```

**App won't start after reboot**
```bash
pm2 status
pm2 logs pisign
```

**Display page is blank**
- Check Display Control in admin — set mode to `playlist` and select a playlist
- Make sure at least one asset exists in the playlist

**Can't reach admin from phone**
```bash
# Check Pi's IP
hostname -I
# Make sure both devices are on the same WiFi network
# Try http://[ip]:3000/admin directly
```

**Database locked / errors**
```bash
pm2 restart pisign
```

**High CPU temp**
- Normal idle temp on Pi Zero 2W is 45–60°C
- Add a heatsink if running above 75°C
- The dashboard shows live CPU temp with color-coded warnings

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
Built for the <strong>Raspberry Pi Zero 2W</strong> — runs great on $15 hardware 🍓
</div>
