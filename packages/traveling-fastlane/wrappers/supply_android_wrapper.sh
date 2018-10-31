#!/bin/bash

set -eu

# Figure out where this script is located.
SELFDIR="`dirname \"$0\"`"
SELFDIR="`cd \"$SELFDIR\" && pwd`"

export BUNDLE_GEMFILE="$SELFDIR/lib/vendor/Gemfile"
unset BUNDLE_IGNORE_CONFIG

export FASTLANE_SKIP_UPDATE_CHECK=1
export FASTLANE_DISABLE_ANIMATION=1
export FASTLANE_HIDE_GITHUB_ISSUES=1

script="$SELFDIR/lib/app/supply_android.rb"

lib_loc="$SELFDIR/lib/app"

exec "$SELFDIR/lib/ruby/bin/ruby" -W0 -I"$lib_loc" -rpreload "$script" "$@"
