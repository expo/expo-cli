# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'supply'
require 'funcs'
require 'json'

$buildPath, $androidPackage, $key, $track = ARGV
$result = nil

captured_stderr = with_captured_stderr{
  begin
    config = {
      apk: $buildPath,
      package_name: $androidPackage,
      json_key: $key,
      track: $track
    }
    Supply.config = FastlaneCore::Configuration.create(Supply::Options.available_options, config)
    Supply::Uploader.new.perform_upload
    $result = JSON.generate({ result: 'success' })
  rescue Exception => e
    $result = JSON.generate({
      result: 'failure',
      reason: 'Unknown reason',
      rawDump: dump_error(e),
    })
  end
}

$stderr.puts $result
