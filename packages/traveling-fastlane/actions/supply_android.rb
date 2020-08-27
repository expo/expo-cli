# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'supply'
require 'funcs'
require 'json'

$buildPath, $androidPackage, $key, $track, $archiveType, $releaseStatus = ARGV
$result = nil

captured_stderr = with_captured_stderr{
  begin
    config = {
      package_name: $androidPackage,
      json_key: $key,
      track: $track
    }

    if not $archiveType
      $archiveType = File.extname($buildPath)[1..-1]
    end
    if $archiveType == "aab"
      config[:aab] = $buildPath
    else
      config[:apk] = $buildPath
    end

    if $releaseStatus
      config[:release_status] = $releaseStatus
    end
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
