#!/bin/bash

set -eu

# Figure out where this script is located.
SELFDIR="`dirname \"$0\"`"
SELFDIR="`cd \"$SELFDIR\" && pwd`"

export BUNDLE_GEMFILE="$SELFDIR/lib/vendor/Gemfile"
unset BUNDLE_IGNORE_CONFIG

export FASTLANE_DISABLE_COLORS=1
export FASTLANE_SKIP_UPDATE_CHECK=1

script="$SELFDIR/lib/app/validate_apple_push_certs.rb"

exec "$SELFDIR/lib/ruby/bin/ruby" -rbundler/setup $script "$@"
