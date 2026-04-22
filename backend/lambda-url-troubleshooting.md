# Lambda Function URL Troubleshooting Session

**Date:** 2026-04-19
**Function:** `allergy-detect-backend` (us-east-2, account 681432800047)
**URL:** `https://vmm6gyo46nq65ovhihbjvpzwzy0fdhty.lambda-url.us-east-2.on.aws/`

---

## User

Can you help me troubleshoot why this Function URL for my AWS Lambda function isn't working `https://vmm6gyo46nq65ovhihbjvpzwzy0fdhty.lambda-url.us-east-2.on.aws/`? The commands in `claude-aws-cmds.txt` have been run to try to make it accessible to public internet. The desired output from

```
curl -i -X POST \
  -H "Authorization: Bearer fake" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://vmm6gyo46nq65ovhihbjvpzwzy0fdhty.lambda-url.us-east-2.on.aws/users/test/allergies
```

is a 401.

## Assistant

To troubleshoot effectively I need to know what you're actually seeing. A few quick questions:

1. **What status code/body does the curl return?** (e.g., 403, 502, timeout, HTML error, empty)
2. Does `aws lambda get-function-url-config --function-name allergy-detect-backend` show `AuthType: NONE`?
3. Does a test invoke (`aws lambda invoke`) succeed, or does it error?

Scanning the setup, a few likely culprits:

- **Firebase init failing at cold start.** In `firebase.js:8`, the SecretsManager client defaults to `us-east-1` if `AWS_REGION` isn't set, but your secret is in `us-east-2`. Lambda normally sets `AWS_REGION` automatically, but worth confirming. If the secret fetch fails, `getDb()` throws, the catch in `middleware/auth.js:21` returns 401 with "Invalid or expired token" — which matches your desired output, but for the wrong reason.
- **Container image handler path.** Your `Dockerfile` uses `CMD ["lambda.handler"]`. For container images, AWS expects this to resolve to `/var/task/lambda.js` exporting `handler`. Verify with `aws lambda get-function-configuration`.
- **Permission statement.** Verify with `aws lambda get-policy --function-name allergy-detect-backend`.

## User

1. 403
2. Yes
3. Yes, it gives a 401 (desired output)

## Assistant

403 with `AuthType: NONE` and successful direct invoke almost always means the resource-based policy is missing or has the wrong `FunctionUrlAuthType` condition. Run:

```
aws lambda get-policy --function-name allergy-detect-backend --query 'Policy' --output text | jq
```

You should see a statement like:

```json
{
  "Sid": "FunctionURLAllowPublicAccess",
  "Effect": "Allow",
  "Principal": "*",
  "Action": "lambda:InvokeFunctionUrl",
  "Resource": "arn:aws:lambda:us-east-2:...:function:allergy-detect-backend",
  "Condition": { "StringEquals": { "lambda:FunctionUrlAuthType": "NONE" } }
}
```

Common issues:

1. **Statement missing entirely** — re-run `add-permission` with explicit `--region us-east-2`.
2. **Condition mismatch** — if the condition is absent or different, remove and re-add the permission with `--function-url-auth-type NONE`.

## User

```json
{
  "Version": "2012-10-17",
  "Id": "default",
  "Statement": [
    {
      "Sid": "FunctionURLAllowPublicAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "lambda:InvokeFunctionUrl",
      "Resource": "arn:aws:lambda:us-east-2:681432800047:function:allergy-detect-backend",
      "Condition": {
        "StringEquals": {
          "lambda:FunctionUrlAuthType": "NONE"
        }
      }
    }
  ]
}
```

## Assistant

Policy is correct. Since direct invoke works and the URL config is right, the 403 is coming from either AWS's edge or a mismatch in what you're hitting. Let's narrow it down:

1. **Run curl with `-v`** — the response headers tell us where the 403 originates.
2. **Confirm the URL matches the config** via `get-function-url-config --query 'FunctionUrl'`.
3. **Check CloudWatch logs** — if the Lambda isn't being invoked at all, the 403 is from the Function URL service.
4. **Check for an SCP** — corporate/school AWS accounts often block unauthenticated Function URLs by SCP.

Strong suspicion: #4 — the symptoms match exactly.

## User

1. Full verbose curl output:

```
< HTTP/1.1 403 Forbidden
< Date: Mon, 20 Apr 2026 05:49:11 GMT
< Content-Type: application/json
< Content-Length: 144
< Connection: keep-alive
< x-amzn-RequestId: 9d7959b4-3241-400a-816a-03112dc50e82
< x-amzn-ErrorType: AccessDeniedException
<
{"Message":"Forbidden. For troubleshooting Function URL authorization issues, see: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html"}
```

2. URL: `https://vmm6gyo46nq65ovhihbjvpzwzy0fdhty.lambda-url.us-east-2.on.aws/`
3. No logs within the last 30 mins
4. Not a member of an Org — personal account I created earlier today

## Assistant

The 403 with `x-amzn-ErrorType: AccessDeniedException` comes from the Function URL authorization layer itself — Lambda never gets invoked. The policy looks right, so something subtler is off. Since this is a brand-new account, I want to rule out a few things:

1. **Confirm account ID and get full URL config:**
   ```
   aws sts get-caller-identity
   aws lambda get-function-url-config --function-name allergy-detect-backend --region us-east-2
   ```
   Checking if `Qualifier` is set (qualified URLs need the permission on that specific alias/version).
2. **Check for versions/aliases:**
   ```
   aws lambda list-versions-by-function --function-name allergy-detect-backend --region us-east-2
   aws lambda list-aliases --function-name allergy-detect-backend --region us-east-2
   ```
3. **Nuke and recreate the URL + permission.**
4. **Rule out a brand-new-account hold** — AWS sometimes places new accounts under review for ~24h.

## User

Full URL config:

```json
{
  "FunctionUrl": "https://vmm6gyo46nq65ovhihbjvpzwzy0fdhty.lambda-url.us-east-2.on.aws/",
  "FunctionArn": "arn:aws:lambda:us-east-2:681432800047:function:allergy-detect-backend",
  "AuthType": "NONE",
  "Cors": { ... },
  "CreationTime": "2026-04-20T03:28:37.481386312Z",
  "LastModifiedTime": "2026-04-20T03:55:27.005620400Z",
  "InvokeMode": "BUFFERED"
}
```

Versions: only `$LATEST`. Aliases: none.

## Assistant

Everything in the config looks correct — no qualifier, auth NONE, InvokeMode BUFFERED, no aliases, single `$LATEST` version. There's no legitimate reason this should be returning 403.

Next step: blow away the URL + permission and recreate cleanly:

```
aws lambda delete-function-url-config --function-name allergy-detect-backend --region us-east-2
aws lambda remove-permission --function-name allergy-detect-backend --statement-id FunctionURLAllowPublicAccess --region us-east-2

aws lambda create-function-url-config --function-name allergy-detect-backend --auth-type NONE --region us-east-2
aws lambda add-permission --function-name allergy-detect-backend --statement-id FunctionURLAllowPublicAccess --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --region us-east-2
```

The URL will get a **new hostname** after recreate. Wait ~30s, then curl again.

If it still 403s with no CloudWatch log entry → strong signal of new-account hold:

- Check **AWS Health Dashboard** (health.aws.amazon.com)
- Check **Billing console** — payment method verified?
- Consider a free-tier support case

**Throwaway test** to isolate account-level vs function-specific:

```
aws lambda create-function --function-name url-test --runtime nodejs20.x --role arn:aws:iam::681432800047:role/allergy-detect-backend-role-38ae7c9y --handler index.handler --zip-file fileb://<(echo 'exports.handler=async()=>({statusCode:200,body:"ok"})' | zip - -) --region us-east-2
aws lambda create-function-url-config --function-name url-test --auth-type NONE --region us-east-2
aws lambda add-permission --function-name url-test --statement-id pub --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --region us-east-2
```

If that test function's URL also 403s, the issue is account-level, not specific to your function.

---

## Summary of findings

- Resource policy, URL config, versions, and aliases all look correct.
- 403 originates at the Function URL authorization layer (Lambda never invoked — no CloudWatch log entries).
- Account is brand new (created same day), not in an AWS Organization.
- Most likely cause: **new-account hold** by AWS.
- Next actions: recreate URL + permission; if still 403, create a throwaway test function URL; if that also 403s, open a support case and check Health/Billing dashboards.
