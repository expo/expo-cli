# Notes

1. Must use the same bundle version as what the ruby interpreter at
   runtime will be, so aka need to use the bundle for Ruby 2.2 and then use just that one and its
   associated ruby tools, ie bundle.

   To install Ruby 2.2.0 you can use rbenv: run `brew install rbenv` and then install Ruby with `rbenv install 2.2.2`.
   Run `eval "$(rbenv init -)"` before continuing.
   Install Bundler with `gem install bundler -v '1.17.3'`.

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
   Ruby `2.2.2` (run `eval "$(rbenv init -)"`) run `bundle install`. This
   will make a new `Gemfile.lock`.
3. You should bump the versions of the packages, in:
   - `Rakefile` (the `VERSION` constant)
   - `publishing/darwin/package.json`
   - `publishing/linux/package.json`
4. Now can just run `rake package`, this will end up doing an `npm publish` as well.
