# Crontab Setup Guide for Auto-Checkpoint Service

This guide will help you set up and troubleshoot the crontab job for the auto-checkpoint service.

## Quick Setup

### 1. Edit Your Crontab

```bash
crontab -e
```

### 2. Add the Auto-Checkpoint Job

Add this line to run every 10 minutes:

```
*/10 * * * * curl -s http://localhost:3000/api/auto-checkpoint > /dev/null 2>&1
```

Or with logging (recommended for debugging):

```
*/10 * * * * curl -s http://localhost:3000/api/auto-checkpoint >> /tmp/auto-checkpoint.log 2>&1
```

### 3. Save and Exit

- In `nano`: Press `Ctrl+X`, then `Y`, then `Enter`
- In `vim`: Press `Esc`, type `:wq`, then `Enter`

## Crontab Syntax

```
* * * * * command
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Examples:**
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour at minute 0
- `0 9 * * *` - Every day at 9:00 AM
- `*/5 * * * *` - Every 5 minutes

## WSL-Specific Setup

On Windows Subsystem for Linux (WSL), cron doesn't start automatically. You need to:

### Start Cron Service

```bash
sudo service cron start
```

### Make Cron Start Automatically (Optional)

Add this to your `~/.bashrc` or `~/.zshrc`:

```bash
# Start cron if not running
if ! pgrep -x "cron" > /dev/null; then
    sudo service cron start
fi
```

Or create a systemd user service (if systemd is enabled in your WSL):

```bash
# Create service file
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/cron.service << EOF
[Unit]
Description=Cron daemon

[Service]
Type=forking
ExecStart=/usr/sbin/cron
Restart=always

[Install]
WantedBy=default.target
EOF

# Enable and start
systemctl --user enable cron
systemctl --user start cron
```

## Troubleshooting

### 1. Check if Cron is Running

```bash
# Check cron process
ps aux | grep cron

# Check cron service status
sudo service cron status
```

### 2. Verify Your Crontab

```bash
# List your crontab entries
crontab -l

# Check crontab syntax
crontab -l | grep -v "^#" | grep -v "^$"
```

### 3. Check Cron Logs

```bash
# View cron logs (Linux)
grep CRON /var/log/syslog

# Or check auth.log
grep CRON /var/log/auth.log

# On WSL, logs might be in different locations
journalctl -u cron  # if systemd is available
```

### 4. Test the Command Manually

Before adding to crontab, test the command directly:

```bash
# Test the endpoint
curl http://localhost:3000/api/auto-checkpoint

# Test with full path (cron uses minimal PATH)
/usr/bin/curl http://localhost:3000/api/auto-checkpoint
```

### 5. Common Issues

#### Issue: Cron job not running

**Solutions:**
- Ensure cron service is running: `sudo service cron start`
- Use full paths in commands (cron has minimal PATH)
- Check file permissions
- Verify the command works when run manually

#### Issue: Command works manually but not in cron

**Solutions:**
- Use absolute paths: `/usr/bin/curl` instead of `curl`
- Set environment variables explicitly in crontab:
  ```
  PATH=/usr/local/bin:/usr/bin:/bin
  */10 * * * * /usr/bin/curl http://localhost:3000/api/auto-checkpoint
  ```
- Ensure Next.js server is running and accessible
- Check if the user running cron has necessary permissions

#### Issue: No output/errors visible

**Solutions:**
- Redirect output to a log file:
  ```
  */10 * * * * /usr/bin/curl http://localhost:3000/api/auto-checkpoint >> /tmp/auto-checkpoint.log 2>&1
  ```
- Check the log file: `tail -f /tmp/auto-checkpoint.log`

#### Issue: Next.js server not accessible

**Solutions:**
- Ensure the Next.js dev server is running: `npm run dev`
- For production, use the production server URL
- Check firewall settings
- Verify the port (3000) is correct

### 6. Debugging Tips

#### Add Timestamp to Logs

```bash
*/10 * * * * echo "$(date): $(curl -s http://localhost:3000/api/auto-checkpoint)" >> /tmp/auto-checkpoint.log 2>&1
```

#### Test with a Simple Command First

```bash
# Add this to crontab to verify cron is working
* * * * * echo "Cron is working: $(date)" >> /tmp/cron-test.log
```

Wait a minute and check `/tmp/cron-test.log`. If you see entries, cron is working.

#### Use Full Paths and Environment

```bash
# Add to crontab
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/home/fetrelo

*/10 * * * * /usr/bin/curl -s http://localhost:3000/api/auto-checkpoint >> /tmp/auto-checkpoint.log 2>&1
```

## Recommended Crontab Entry

Here's a complete, production-ready crontab entry:

```bash
# Auto-checkpoint service - runs every 10 minutes
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/home/fetrelo

*/10 * * * * /usr/bin/curl -s -f http://localhost:3000/api/auto-checkpoint >> /tmp/auto-checkpoint.log 2>&1 || echo "$(date): Auto-checkpoint failed" >> /tmp/auto-checkpoint-error.log
```

This will:
- Run every 10 minutes
- Use full paths
- Log output to `/tmp/auto-checkpoint.log`
- Log errors separately to `/tmp/auto-checkpoint-error.log`
- Fail silently if curl fails (use `-f` flag)

## Alternative: Use systemd Timer (Linux with systemd)

If you prefer systemd over cron:

1. Create a service file: `/etc/systemd/system/auto-checkpoint.service`
```ini
[Unit]
Description=Auto-checkpoint service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s http://localhost:3000/api/auto-checkpoint
User=fetrelo
```

2. Create a timer file: `/etc/systemd/system/auto-checkpoint.timer`
```ini
[Unit]
Description=Run auto-checkpoint every 10 minutes

[Timer]
OnBootSec=10min
OnUnitActiveSec=10min

[Install]
WantedBy=timers.target
```

3. Enable and start:
```bash
sudo systemctl enable auto-checkpoint.timer
sudo systemctl start auto-checkpoint.timer
```

## Verify It's Working

1. Check the log file:
   ```bash
   tail -f /tmp/auto-checkpoint.log
   ```

2. Check cron is running:
   ```bash
   ps aux | grep cron
   ```

3. Manually trigger to compare:
   ```bash
   curl http://localhost:3000/api/auto-checkpoint
   ```

4. Wait 10 minutes and check the log again to see if it ran automatically.

