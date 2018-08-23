#!/bin/bash

set -eu

# Figure out where this script is located.
SELFDIR="`dirname \"$0\"`"
SELFDIR="`cd \"$SELFDIR\" && pwd`"

export BUNDLE_GEMFILE="$SELFDIR/lib/vendor/Gemfile"
unset BUNDLE_IGNORE_CONFIG

export FASTLANE_DISABLE_COLORS=1
export FASTLANE_SKIP_UPDATE_CHECK=1
export FASTLANE_DISABLE_ANIMATION=1

script="$SELFDIR/lib/app/fetch_new_provisioning_profile.rb"

lib_loc="$SELFDIR/lib/app"

exec "$SELFDIR/lib/ruby/bin/ruby" -W0 -I"$lib_loc" -rpreload "$script" "$@"
