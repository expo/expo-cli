# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'
require 'base64'

$action, $appleId, $password, $teamId, $bundleId, $experienceName, $certIds = ARGV

ENV['FASTLANE_ITC_TEAM_ID'] = $teamId

def manage(action)
  Spaceship::Portal.login($appleId, $password)
  Spaceship::Portal.client.team_id = $teamId
  if action == 'create'
    app = Spaceship::Portal.app.create!(bundle_id:$bundleId, name: $experienceName)
    JSON.generate({result:'success',
                   appId: app.app_id,
                   features: app.features,
                   enabledFeatures: app.enable_services})
  elsif action == 'dump-certs'
    certs = Spaceship.certificate.all.map{|cert| cert.to_s}
    JSON.generate({result:'success', certs:certs})
  elsif action == 'verify'
    queriedApp = Spaceship::Portal.app.find $bundleId
    if queriedApp == nil
      JSON.generate({result:'failure',
                     reason:"App could not be found for bundle id: #{$bundleId}"})
    else
      JSON.generate({result:'success',
                     name:queriedApp.name,
                     prefix:queriedApp.prefix})
    end
  elsif action == 'revoke-provisioning-profile'
    pp = Spaceship::Portal.provisioning_profile.app_store.find_by_bundle_id(bundle_id: $bundleId)
    if pp.length != 0
      ppId = pp[0].id
      pp[0].delete!
      JSON.generate({result:'success', msg:"Revoked provisioning profile #{ppId}"})
    else
      rsn = "Revoked certificates but could not find provisioning profile by bundle #{$bundleID} to delete"
      JSON.generate({result:'failure',
                     reason: rsn})
    end

  elsif action == 'revoke-certs'
    # array of ids
    certIds = eval($certIds)
    revokeCount = 0
    # Includes push certs
    certificates = Spaceship.certificate.all.find_all {|cert| certIds.include?(cert.id)}
    for c in certificates do
      c.revoke!
      revokeCount += 1
    end
    JSON.generate({result:'success',
                   revokeCount:revokeCount,
                   msg:"Revoked certs"})
  else
    JSON.generate({result:'failure',
                   reason:"Unknown action requested: #{action}"})
  end
end

json_reply = with_captured_stderr{
  begin
    $stderr.puts (manage $action)
  rescue Spaceship::Client::UnexpectedResponse => e
    r = "#{e.error_info['userString']} #{e.error_info['resultString']}"
    $stderr.puts(JSON.generate({result:'failure',
                                reason:r,
                                rawDump:e.error_info}))
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Invalid credentials',
                                rawDump:invalid_cred.preferred_error_info}))
  rescue Exception => e
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Unknown reason',
                                rawDump:e.message}))
  end
}

$stderr.puts json_reply
