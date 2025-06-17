/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "otp": {
      "enabled": true,
      "duration": 300,
      "length": 6,
      "emailTemplate": {
        "subject": "Your {APP_NAME} Login Code",
        "body": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);\">\n          <h2 style=\"color: #333; text-align: center; margin-bottom: 30px;\">Your Login Code</h2>\n          <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;\">\n            <div style=\"font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; font-family: monospace;\">\n              {OTP}\n            </div>\n          </div>\n          <p style=\"color: #666; text-align: center; margin: 20px 0;\">\n            Enter this code to complete your sign-in. This code will expire in 5 minutes.\n          </p>\n          <p style=\"color: #999; font-size: 14px; text-align: center; margin-top: 30px;\">\n            If you didn't request this code, you can safely ignore this email.\n          </p>\n          <hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\" />\n          <p style=\"color: #999; font-size: 12px; text-align: center;\">\n            {APP_NAME} - Secure Email Authentication\n          </p>\n        </div>\n      </div>"
      }
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // revert collection data
  unmarshal({
    "otp": {
      "enabled": false,
      "duration": 180,
      "length": 8,
      "emailTemplate": {
        "body": "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
        "subject": "OTP for {APP_NAME}"
      }
    }
  }, collection)

  return app.save(collection)
}) 