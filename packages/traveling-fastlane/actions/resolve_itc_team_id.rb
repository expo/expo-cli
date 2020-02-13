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

    if ! (developer_team && developer_team['name'])
      teamIds = portal_client.teams.map { |team| team['teamId'] }
      $result = JSON.generate({
        result: 'failure',
        reason: "Your Apple Developer Account doesn't seem to be on #{ENV['FASTLANE_TEAM_ID']} team, available teams: #{teamIds.join(', ')}. Are you sure you chose the correct account/team?"
      })
    else
      Spaceship::Tunes.login(ENV['FASTLANE_USER'], ENV['FASTLANE_PASSWORD'])

      itunes_teams = Spaceship::Tunes.client.teams
      itunes_team = itunes_teams.find { |team|
        team && team['contentProvider'] && team['contentProvider']['name'] && team['contentProvider']['name'].start_with?(developer_team['name'])
      }

      if itunes_team.nil?
        if itunes_teams.length === 1
          itunes_team = itunes_teams[0]
        else
          puts "Please choose the App Store Connect team"
          itunes_teams.each_with_index { |i, idx|
            puts "#{idx + 1}) #{i['contentProvider']['name']}"
          }
          n = 0
          loop do
            print "Available teams (please enter number 1-#{itunes_teams.length}): "
            n = $stdin.gets.to_i
            break if (n >= 1 && n <= itunes_teams.length)
            puts "Please enter a valid number!"
          end
          itunes_team = itunes_teams[n - 1]
        end
      end

      if itunes_team.nil?
        $result = JSON.generate({
          result: 'failure',
          reason: "Failed to find your team (#{ENV['FASTLANE_TEAM_ID']} - #{developer_team['name']}) on iTunes, something went terribly wrong!"
        })
      else
        itc_team_id = itunes_team['contentProvider']['contentProviderId'].to_s
        $result = JSON.generate({
          result: 'success',
          itc_team_id: itc_team_id,
        })
      end
    end
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
