# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'spaceship'
require 'pilot'
require 'funcs'
require 'json'

$result = nil

captured_stderr = with_captured_stderr{
  begin
    portal_client = Spaceship::Portal.login(ENV['FASTLANE_USER'], ENV['FASTLANE_PASSWORD'])
    developer_team = portal_client.teams.find { |team| team['teamId'] == ENV['FASTLANE_TEAM_ID'] }

    Spaceship::Tunes.login(ENV['FASTLANE_USER'], ENV['FASTLANE_PASSWORD'])
    itunes_team = Spaceship::Tunes.client.teams.find { |team| team['contentProvider']['name'].start_with? developer_team['name']  }

    itc_team_id = itunes_team['contentProvider']['contentProviderId'].to_s

    $result = JSON.generate({
      result: 'success',
      itc_team_id: itc_team_id,
    })
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
