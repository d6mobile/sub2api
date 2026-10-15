#!/bin/sh
set -e

# Fix data directory permissions when running as root.
# Docker named volumes / host bind-mounts may be owned by root,
# preventing the non-root sub2api user from writing files.
if [ "$(id -u)" = "0" ]; then
    mkdir -p /app/data
    # Use || true to avoid failure on read-only mounted files (e.g. config.yaml:ro)
    chown -R sub2api:sub2api /app/data 2>/dev/null || true
    # Re-invoke this script as sub2api so the flag-detection below
    # also runs under the correct user.
    exec su-exec sub2api "$0" "$@"
fi

# Compatibility: if the first arg looks like a flag (e.g. --help),
# prepend the default binary so it behaves the same as the old
# ENTRYPOINT ["/app/sub2api"] style.
if [ "${1#-}" != "$1" ]; then
    set -- /app/sub2api "$@"
fi

# If the command to run is the main server binary /app/sub2api without subcommands,
# loop on clean exit (exit code 0) so container platforms like Railway/Docker
# do not terminate the container if the process exits for a restart.
# Signals (SIGTERM/SIGINT) are trapped and forwarded to ensure graceful container shutdown.
if [ "$1" = "/app/sub2api" ] && [ $# -eq 1 ]; then
    child_pid=""
    stop_requested=0

    handle_term() {
        stop_requested=1
        if [ -n "$child_pid" ]; then
            kill -TERM "$child_pid" 2>/dev/null || true
        fi
    }
    handle_int() {
        stop_requested=1
        if [ -n "$child_pid" ]; then
            kill -INT "$child_pid" 2>/dev/null || true
        fi
    }
    trap handle_term TERM
    trap handle_int INT

    while [ $stop_requested -eq 0 ]; do
        "$@" &
        child_pid=$!
        # set +e: the wait below is interrupted by the TERM/INT trap and then
        # returns 128+signal, which would trigger errexit and abort the script
        # with 143 before the stop_requested check is reached.
        set +e
        wait "$child_pid" 2>/dev/null
        exit_code=$?
        set -e

        # If container was requested to stop, exit immediately
        if [ $stop_requested -eq 1 ]; then
            exit 0
        fi

        # If process exited cleanly (like restart after setup), restart server
        if [ $exit_code -eq 0 ]; then
            echo "Sub2API process exited with 0. Restarting server in 1s..."
            sleep 1
        else
            echo "Sub2API process exited with code $exit_code."
            exit $exit_code
        fi
    done
else
    exec "$@"
fi
