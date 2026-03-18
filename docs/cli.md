# CLI Reference

After running `gfl load-cookies cookies.json` once, **all commands work with no flags**:

```bash
gfl children
gfl screen-time <account-id>

# or using the full name
g-family-link children
```

---

## Authentication

Google Family Link uses cookie-based authentication. You export cookies from your browser and load them into the CLI.

### 1. Export cookies from Chrome

1. Install the [Cookie-Editor](https://chromewebstore.google.com/detail/hlkenndednhfkekhgcdicdfddnkalmdm) extension for Chrome
2. Go to [familylink.google.com](https://familylink.google.com) and log in with the **parent** Google account
3. Click the Cookie-Editor extension icon
4. Click **Export** (bottom-left) — copies all cookies as JSON to your clipboard
5. Paste into a file (e.g. `cookies.json`)

### 2. Load cookies

```bash
gfl load-cookies cookies.json
```

Output:

```
Loaded 42 cookies.
```

Cookies are saved to `~/.config/g-family-link/cookies.json` (permissions `600`). All subsequent CLI commands use them automatically.

To remove saved cookies:

```bash
gfl logout
```

### Multiple Google accounts

If you have multiple Google accounts logged in, the cookies give access to all of them. Use `--auth-user` to select which one has Family Link:

```bash
gfl children                      # tries account 0 (default)
gfl --auth-user 1 children        # tries account 1
gfl --auth-user 2 children        # tries account 2
```

When the wrong account is selected, you'll see:

```
No supervised children found on this account.
Try a different account with: gfl --auth-user 1 children
```

Once you find the right index, use it in all commands:

```bash
gfl --auth-user 3 devices <account-id>
gfl --auth-user 3 screen-time <account-id>
```

---

## Commands

### `load-cookies`

Load cookies from a JSON file (Cookie-Editor export).

```bash
gfl load-cookies <file>
```

### `logout`

Remove saved cookies.

```bash
gfl logout
```

### `status`

Check authentication status.

```bash
gfl status
```

### `children`

List supervised children with their IDs.

```bash
gfl children
```

### `devices`

List devices for a child.

```bash
gfl devices <account-id>
```

### `screen-time`

Get today's screen time with per-app breakdown.

```bash
gfl screen-time <account-id>
```

### `lock`

Lock a child's device.

```bash
gfl lock <account-id> <device-id>
```

### `unlock`

Unlock a child's device.

```bash
gfl unlock <account-id> <device-id>
```

### `time-limits`

Get applied time limits for all devices (used time, remaining time, active restrictions).

```bash
gfl time-limits <account-id>
```

### `add-bonus`

Add a time bonus to a device.

```bash
gfl add-bonus <account-id> <device-id> <minutes>
```

### `cancel-bonus`

Cancel an active time bonus.

```bash
gfl cancel-bonus <account-id> <override-id>
```

The `override-id` can be found in the output of `time-limits`.

### `enable-bedtime`

Enable bedtime restrictions.

```bash
gfl enable-bedtime <account-id> [--rule-id <id>]
```

The rule ID is auto-detected if not provided.

### `disable-bedtime`

Disable bedtime restrictions.

```bash
gfl disable-bedtime <account-id> [--rule-id <id>]
```

### `set-bedtime`

Set bedtime schedule for a specific day.

```bash
gfl set-bedtime <account-id> <start> <end> [--day <n>]
```

- `<start>` / `<end>`: time in `HH:MM` format
- `--day`: day of week, 1=Monday, 7=Sunday (default: today)

```bash
gfl set-bedtime <account-id> "20:45" "07:30" --day 1   # Monday
gfl set-bedtime <account-id> "21:00" "07:00"            # today
```

### `enable-school-time`

Enable school time restrictions.

```bash
gfl enable-school-time <account-id> [--rule-id <id>]
```

### `disable-school-time`

Disable school time restrictions.

```bash
gfl disable-school-time <account-id> [--rule-id <id>]
```

### `enable-daily-limit`

Enable daily screen time limit.

```bash
gfl enable-daily-limit <account-id>
```

### `disable-daily-limit`

Disable daily screen time limit.

```bash
gfl disable-daily-limit <account-id>
```

### `set-daily-limit`

Set daily screen time limit for a device (in minutes).

```bash
gfl set-daily-limit <account-id> <device-id> <minutes>
```

```bash
gfl set-daily-limit <account-id> <device-id> 120   # 2 hours
```

### `rules`

View time limit rules (bedtime and school time schedules).

```bash
gfl rules <account-id>
```
