# Notes

1. Must use the same bundle version as what the ruby interpreter at
   runtime will be, so aka need to use the bundle for Ruby 2.2 Easiest
   way: `brew install ruby@2.2`, and then use just that one and its
   associated ruby tools, ie bundle.

2. Remember that if you want to add a gem need to check if its a
   native dependency, if it is, then need to use the prebuilt versions
   done by the traveling ruby people, it is platform dependent. Then
   need to run bundle install in the root, so that we get a new
   `Gemfile.lock`.

3. Build the whole thing with: `rake package`, need to do this any
   time you do a change with the scripts in `actions`.

# To bump a version of fastlane

1. Go to `Gemfile` and change version.
2. Using the ruby interpreter (and associated ruby tools) provided by
   `brew install ruby@2.2` or whatever is the version of the
   interpreter built by `traveling-ruby`, do `bundle install`. This
   will make a new `Gemfile.lock`.
3. You should probably bump the versions of the packages, do this in
   the `Rakefile`, the `VERSION` variable. Then also change in the
   `darwin` and `linux` packages in publishing, need to change in
   `index.js` and their respective `package.json`
4. Now can just run `rake package`, this will end up doing an `npm publish` as well.
