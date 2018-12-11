# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'
require 'base64'

$appleId, $password, $teamId, $name = ARGV

ENV['FASTLANE_TEAM_ID'] = $teamId

json_reply = with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId

    # (dsokal)
    # don't remove the following line until a new version of fastlane with my fix is released
    Spaceship::Portal::Key.all

    key = Spaceship::Portal::Key.create(name: $name, apns: true)
    key_p8 = key.download
    $stderr.puts(JSON.generate({
      result: 'success',
      apnsKeyP8: key_p8,
      apnsKeyId: key.id,
    }))
  rescue Spaceship::Client::UnexpectedResponse => e
    $stderr.puts(JSON.generate({
      result: 'failure',
      reason: 'Unexpected response',
      rawDump: e.error_info || dump_error(e),
    }))
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $stderr.puts(JSON.generate({
      result: 'failure',
      reason: 'Invalid credentials',
      rawDump: invalid_cred.preferred_error_info
    }))
  rescue Exception => e
    $stderr.puts(JSON.generate({
      result:'failure',
      reason:'Unknown reason',
      rawDump:dump_error(e)}))
  end
}

$stderr.puts json_reply
