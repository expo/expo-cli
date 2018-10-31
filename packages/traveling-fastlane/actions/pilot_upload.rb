# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'pilot'
require 'funcs'
require 'json'

$ipaPath, $username = ARGV
$result = nil

captured_stderr = with_captured_stderr{
  begin
    config = {
      ipa: $ipaPath,
      username: $username,
      skip_waiting_for_build_processing: true,
    }
    Pilot::BuildManager.new.upload(config)
    $result = JSON.generate({ result: 'success' })
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $result = JSON.generate({
      result: 'failure',
      reason: 'Invalid Apple ID credentials',
      rawDump: invalid_cred.preferred_error_info,
    })
  rescue Exception => e
    $result = JSON.generate({
      result: 'failure',
      reason: 'Unknown reason',
      rawDump: dump_error(e),
    })
  end
}

$stderr.puts $result
