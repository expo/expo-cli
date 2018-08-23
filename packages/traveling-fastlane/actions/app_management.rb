# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'spaceship'
require 'json'
require 'funcs'
require 'base64'

$action, $appleId, $password, $teamId, $bundleId,
$experienceName, $certIds,
$distOrPush, $isEnterprise = ARGV[0].gsub(/\s+/m, ' ').strip.split(" ")

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
  elsif action == 'dumpDistCert' or action == 'dumpPushCert'
    dumpCert(action, $isEnterprise)
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
  elsif action == 'revokeProvisioningProfile'
    pp = Spaceship::Portal.provisioning_profile.app_store.find_by_bundle_id(bundle_id: $bundleId)
    if pp.length != 0
      ppId = pp[0].id
      profile = pp[0]
      profile.delete!
      JSON.generate({result:'success', msg:"Revoked provisioning profile #{ppId} for #{$bundleId}"})
    else
      rsn = "Revoked certificates but could not find provisioning profile by bundle #{$bundleId} to delete"
      JSON.generate({result:'failure', reason: rsn})
    end

  elsif action == 'revokeCerts'
    # array of ids
    certIds = eval($certIds)
    revokeCount = 0
    # Includes push certs
    certificates = Spaceship.certificate.all.find_all {|cert| certIds.include?(cert.id)}
    for c in certificates do
      c.revoke!
      revokeCount += 1
    end
    JSON.generate({result:'success', revokeCount:revokeCount, msg:"Revoked certs"})
  else
    JSON.generate({result:'failure',
                   reason:"Unknown action requested: #{action}"})
  end
end

json_reply = with_captured_stderr{
  begin
    $stderr.puts (manage $action)
  rescue Spaceship::Client::UnexpectedResponse => e
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Unexpected response',
                                rawDump:e.error_info || dump_error(e)}))
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Invalid credentials',
                                rawDump:invalid_cred.preferred_error_info}))
  rescue Exception => e
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Unknown reason',
                                rawDump:dump_error(e)}))
  end
}

$stderr.puts json_reply
