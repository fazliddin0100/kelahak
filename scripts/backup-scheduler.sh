#!/bin/sh
set -eu

mkdir -p /etc/crontabs
printf '0 2 * * * /usr/local/bin/backup-once.sh\n' > /etc/crontabs/root

# Make an initial snapshot on container start, then repeat daily at 02:00 Tashkent time.
/usr/local/bin/backup-once.sh
exec crond -f -l 2
