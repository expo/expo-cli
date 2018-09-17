# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'rubygems'
require 'funcs'
require 'json'
require 'base64'
  
$bundleId, $appName, $username = ARGV[0].gsub(/\s+/m, ' ').strip.split(" ")
$version = ">= 0.a"
$result = nil

captured_stderr = with_captured_stderr{
  ARGV.clear
  ARGV<< "produce"
  ARGV<< "--app_identifier"<< $bundleId<< "--app_name"<< $appName<< "--username"<< $username

  begin
    if Gem.respond_to?(:activate_bin_path)
      load Gem.activate_bin_path('fastlane', 'fastlane', $version)
    else
      gem "fastlane", $version
      load Gem.bin_path("fastlane", "fastlane", $version)
    end
    $result = JSON.generate({result:'success'})
  rescue Exception => e
    $result = JSON.generate({result:'failure',
                            reason:'Unknown reason',
                            rawDump:dump_error(e)})
  end
}

$stderr.puts $result
