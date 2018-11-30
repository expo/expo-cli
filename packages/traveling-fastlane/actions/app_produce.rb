# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'produce'
require 'funcs'
require 'json'

$bundleId, $appName, $username, $language = ARGV
$result = nil

captured_stderr = with_captured_stderr{
  begin
    config = {
      app_identifier: $bundleId,
      app_name: $appName,
      username: $username,
      language: $language,
    }
    Produce.config = FastlaneCore::Configuration.create(Produce::Options.available_options, config)
    Produce::Manager.start_producing
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
