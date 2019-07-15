require 'spaceship'
require 'json'
require 'base64'
require 'optparse'
require_relative 'funcs'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: ensure_app_exists.rb [options] appleId password teamId bundleId name"

  opts.on("-p", "--push-notifications", "enable push notifications") do |push_notifications|
    options[:enablePushNotifications] = push_notifications
  end

end.parse!

$appleId, $password, $teamId, $bundleId, $name = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId

def ensure_app_exists()
  app = Spaceship::Portal.app.find $bundleId
  if app == nil
    {created: true, app: Spaceship::Portal.app.create!(bundle_id: $bundleId, name: $name)}
  else
    {created: false, app: app}
  end
end

def update_service(app, options)
  if options[:enablePushNotifications] && !app.details.features["push"]
    app_service = Spaceship::Portal.app_service.push_notification.on
    app.update_service(app_service)
  end
end

$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId
    created, app = ensure_app_exists().values_at(:created, :app)
    update_service(app, options)
    $result = { result: 'success', created: created }
  rescue Spaceship::Client::UnexpectedResponse => e
    $result = {
      result: 'failure',
      reason: 'Unexpected response',
      rawDump: e.error_info || dump_error(e)
    }
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $result = {
      result: 'failure',
      reason: 'Invalid credentials',
      rawDump: invalid_cred.preferred_error_info
    }
  rescue Exception => e
    $result = {
      result: 'failure',
      reason: 'Unknown reason',
      rawDump: dump_error(e)
    }
  end
}

$stderr.puts JSON.generate($result)
