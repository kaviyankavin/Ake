$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "Listening on http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server."
    $root = Get-Location
} catch {
    Write-Host "Failed to start listener: $_"
    exit
}

function ConvertTo-JSONArray($obj) {
    if ($null -eq $obj) {
        return "[]"
    }
    if ($obj.Count -eq 0) {
        return "[]"
    }
    $json = ConvertTo-Json -InputObject $obj -Depth 10 -Compress
    if (-not $json.StartsWith("[")) {
        return "[$json]"
    }
    return $json
}

function ConvertFrom-JSONArray($json) {
    if ($null -eq $json -or $json.Trim() -eq "") {
        return @()
    }
    $parsed = $json | ConvertFrom-Json
    if ($parsed -is [Array]) {
        return $parsed
    } elseif ($null -ne $parsed) {
        return @($parsed)
    }
    return @()
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $url = $request.Url.LocalPath
        
        # --- API ROUTES FOR CUSTOMER AUTH & FEEDBACK ---
        if ($url.StartsWith("/api/")) {
            $feedbackFile = Join-Path $root "feedback.json"
            if (-not (Test-Path $feedbackFile)) {
                "[]" | Out-File -FilePath $feedbackFile -Encoding utf8
            }

            $customersFile = Join-Path $root "customers.json"
            if (-not (Test-Path $customersFile)) {
                '[{"id":"cust_8489107668","name":"kaviyan","mobile":"8489107668","password":"1234","createdAt":"2026-07-31 22:38:16"}]' | Out-File -FilePath $customersFile -Encoding utf8
            }

            $sessionsFile = Join-Path $root "sessions.json"
            if (-not (Test-Path $sessionsFile)) {
                "[]" | Out-File -FilePath $sessionsFile -Encoding utf8
            }
            
            $response.ContentType = "application/json; charset=utf-8"
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Customer-Token, X-Admin-Token, X-Session-Token")
            
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            # Helper to retrieve authenticated session from request
            function Get-Session($req, $sFile) {
                $token = $null
                $auth = $req.Headers["Authorization"]
                if ($auth -and $auth.StartsWith("Bearer ")) {
                    $token = $auth.Substring(7).Trim()
                }
                if (-not $token) { $token = $req.Headers["X-Customer-Token"] }
                if (-not $token) { $token = $req.Headers["X-Admin-Token"] }
                if (-not $token) { $token = $req.Headers["X-Session-Token"] }
                if (-not $token -or $token.Trim() -eq "") { return $null }

                if (Test-Path $sFile) {
                    $sJson = Get-Content -Path $sFile -Raw -Encoding utf8
                    $sList = ConvertFrom-JSONArray $sJson
                    foreach ($s in $sList) {
                        if ($s.token -eq $token) {
                            return $s
                        }
                    }
                }
                return $null
            }

            # --- CUSTOMER AUTH: LOGIN / REGISTER ---
            if ($request.HttpMethod -eq "POST" -and $url -eq "/api/customer/login") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $loginData = $body | ConvertFrom-Json
                $mobile = ("" + $loginData.mobile).Trim()
                $name = ("" + $loginData.name).Trim()
                $password = ("" + $loginData.password).Trim()

                if ($mobile.Length -lt 10) {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": false, "message": "Please enter a valid 10-digit mobile number."}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }

                $cJson = Get-Content -Path $customersFile -Raw -Encoding utf8
                $customers = ConvertFrom-JSONArray $cJson

                $matchedCustomer = $null
                foreach ($c in $customers) {
                    if ($c.mobile -eq $mobile) {
                        $matchedCustomer = $c
                        break
                    }
                }

                if ($null -eq $matchedCustomer) {
                    # Create new customer
                    $custId = "cust_" + $mobile
                    $custName = if ($name) { $name } else { "Customer " + $mobile.Substring($mobile.Length - 4) }
                    $custPass = if ($password) { $password } else { "1234" }
                    $matchedCustomer = [PSCustomObject]@{
                        id = $custId
                        mobile = $mobile
                        name = $custName
                        password = $custPass
                        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    }
                    $customers = @($matchedCustomer) + $customers
                    $updatedCJson = ConvertTo-JSONArray $customers
                    [System.IO.File]::WriteAllText($customersFile, $updatedCJson, [System.Text.Encoding]::UTF8)
                } else {
                    if ($name -and $name -ne $matchedCustomer.name) {
                        $matchedCustomer.name = $name
                        $updatedCJson = ConvertTo-JSONArray $customers
                        [System.IO.File]::WriteAllText($customersFile, $updatedCJson, [System.Text.Encoding]::UTF8)
                    }
                }

                # Generate secure session token
                $token = "cust_" + [Guid]::NewGuid().ToString("N")
                $newSession = [PSCustomObject]@{
                    token = $token
                    role = "customer"
                    customerId = $matchedCustomer.id
                    mobile = $matchedCustomer.mobile
                    name = $matchedCustomer.name
                    createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                }

                $sJson = Get-Content -Path $sessionsFile -Raw -Encoding utf8
                $sessions = ConvertFrom-JSONArray $sJson
                $sessions = @($newSession) + $sessions
                $updatedSJson = ConvertTo-JSONArray $sessions
                [System.IO.File]::WriteAllText($sessionsFile, $updatedSJson, [System.Text.Encoding]::UTF8)

                $respObj = [PSCustomObject]@{
                    success = $true
                    token = $token
                    customer = [PSCustomObject]@{
                        id = $matchedCustomer.id
                        name = $matchedCustomer.name
                        mobile = $matchedCustomer.mobile
                    }
                }
                $responseBody = ConvertTo-Json -InputObject $respObj -Depth 5 -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            # --- CUSTOMER AUTH: CURRENT USER ---
            if ($request.HttpMethod -eq "GET" -and $url -eq "/api/customer/me") {
                $session = Get-Session $request $sessionsFile
                if ($null -ne $session -and $session.role -eq "customer") {
                    $respObj = [PSCustomObject]@{
                        authenticated = $true
                        customer = [PSCustomObject]@{
                            id = $session.customerId
                            name = $session.name
                            mobile = $session.mobile
                        }
                    }
                    $responseBody = ConvertTo-Json -InputObject $respObj -Depth 5 -Compress
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                    $response.Close()
                    continue
                } else {
                    $response.StatusCode = 401
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"authenticated": false, "error": "Not logged in"}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }
            }

            # --- CUSTOMER AUTH: LOGOUT ---
            if ($request.HttpMethod -eq "POST" -and $url -eq "/api/customer/logout") {
                $session = Get-Session $request $sessionsFile
                if ($null -ne $session) {
                    $sJson = Get-Content -Path $sessionsFile -Raw -Encoding utf8
                    $sessions = ConvertFrom-JSONArray $sJson
                    $remaining = @()
                    foreach ($s in $sessions) {
                        if ($s.token -ne $session.token) {
                            $remaining += $s
                        }
                    }
                    $updatedSJson = ConvertTo-JSONArray $remaining
                    [System.IO.File]::WriteAllText($sessionsFile, $updatedSJson, [System.Text.Encoding]::UTF8)
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": true, "message": "Logged out successfully"}')
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            # --- ADMIN AUTH: LOGIN ---
            if ($request.HttpMethod -eq "POST" -and $url -eq "/api/admin/login") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $adminData = $body | ConvertFrom-Json
                $username = ("" + $adminData.username).Trim()
                $password = ("" + $adminData.password).Trim()
                $otp = ("" + $adminData.otp).Trim()

                $validAdmin = ($username -eq "Kavin" -or $username -eq "Ashok Kumar") -and 
                              ($password -eq "AshokKavinRice") -and 
                              ($otp -eq "848910" -or ($otp.Length -eq 6 -and $otp -match '^\d+$'))

                if ($validAdmin) {
                    $token = "adm_" + [Guid]::NewGuid().ToString("N")
                    $newSession = [PSCustomObject]@{
                        token = $token
                        role = "admin"
                        username = $username
                        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    }

                    $sJson = Get-Content -Path $sessionsFile -Raw -Encoding utf8
                    $sessions = ConvertFrom-JSONArray $sJson
                    $sessions = @($newSession) + $sessions
                    $updatedSJson = ConvertTo-JSONArray $sessions
                    [System.IO.File]::WriteAllText($sessionsFile, $updatedSJson, [System.Text.Encoding]::UTF8)

                    $respObj = [PSCustomObject]@{
                        success = $true
                        token = $token
                        role = "admin"
                        username = $username
                    }
                    $responseBody = ConvertTo-Json -InputObject $respObj -Depth 5 -Compress
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                    $response.Close()
                    continue
                } else {
                    $response.StatusCode = 401
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": false, "message": "Invalid admin credentials or OTP."}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }
            }

            # --- PRIVATE CUSTOMER FEEDBACK: GET MY FEEDBACK ---
            # Strict database security: only returns records belonging to the authenticated customer token.
            # Client-supplied IDs in URL or body are completely ignored to prevent unauthorized access.
            if ($request.HttpMethod -eq "GET" -and $url -eq "/api/feedback/my") {
                $session = Get-Session $request $sessionsFile
                if ($null -eq $session -or ($session.role -ne "customer" -and $session.role -ne "admin")) {
                    $response.StatusCode = 401
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Unauthorized. Please log in to view your feedback."}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }

                $json = Get-Content -Path $feedbackFile -Raw -Encoding utf8
                $reviews = ConvertFrom-JSONArray $json
                
                $myReviews = @()
                foreach ($r in $reviews) {
                    $match = $false
                    if ($null -ne $r.mobile -and $null -ne $session.mobile -and $r.mobile.ToString() -eq $session.mobile.ToString()) {
                        $match = $true
                    }
                    if (-not $match -and $null -ne $r.customerId -and $null -ne $session.customerId -and $r.customerId.ToString() -eq $session.customerId.ToString()) {
                        $match = $true
                    }
                    if ($match) {
                        $myReviews += $r
                    }
                }

                $responseBody = ConvertTo-JSONArray $myReviews
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            # --- NO PUBLIC FEEDBACK LIST (PRIVATE PRIVACY REQUIREMENT) ---
            if ($request.HttpMethod -eq "GET" -and $url -eq "/api/feedback/public") {
                # Customer feedback is strictly private. Return empty list.
                $responseBody = "[]"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }
            
            # --- ADMIN ACCESS: GET ALL FEEDBACK ---
            # Restricted strictly to admin role with valid admin token
            if ($request.HttpMethod -eq "GET" -and $url -eq "/api/feedback/admin") {
                $session = Get-Session $request $sessionsFile
                if ($null -eq $session -or $session.role -ne "admin") {
                    $response.StatusCode = 403
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Forbidden: Admin access required."}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }

                $json = Get-Content -Path $feedbackFile -Raw -Encoding utf8
                if ($json.Trim() -eq "") {
                    $json = "[]"
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }
            
            # --- SUBMIT FEEDBACK (PRIVATE & SECURE) ---
            if ($request.HttpMethod -eq "POST" -and $url -eq "/api/feedback") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $newReview = $body | ConvertFrom-Json
                $session = Get-Session $request $sessionsFile

                $name = ("" + $newReview.name).Trim()
                $mobile = ("" + $newReview.mobile).Trim()
                $rating = [int]$newReview.rating
                $reviewText = ("" + $newReview.review).Trim()
                $photo = $newReview.photo

                if ($null -ne $session -and $session.role -eq "customer") {
                    $customerId = $session.customerId
                    if (-not $mobile) { $mobile = $session.mobile }
                    if (-not $name) { $name = $session.name }
                } else {
                    $customerId = "cust_" + $mobile
                    # Ensure customer record exists in customers.json so they can see this feedback when they log in!
                    if ($mobile -and $mobile.Length -ge 10) {
                        $cJson = Get-Content -Path $customersFile -Raw -Encoding utf8
                        $customers = ConvertFrom-JSONArray $cJson
                        $found = $false
                        foreach ($c in $customers) {
                            if ($c.mobile -eq $mobile) {
                                $found = $true
                                break
                            }
                        }
                        if (-not $found) {
                            $newCustomer = [PSCustomObject]@{
                                id = $customerId
                                mobile = $mobile
                                name = if ($name) { $name } else { "Customer" }
                                password = "1234"
                                createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                            }
                            $customers = @($newCustomer) + $customers
                            $updatedCJson = ConvertTo-JSONArray $customers
                            [System.IO.File]::WriteAllText($customersFile, $updatedCJson, [System.Text.Encoding]::UTF8)
                        }
                    }
                }

                $id = [Guid]::NewGuid().ToString()
                $dateTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                
                $feedbackItem = [PSCustomObject]@{
                    id = $id
                    customerId = $customerId
                    name = $name
                    mobile = $mobile
                    rating = $rating
                    review = $reviewText
                    photo = $photo
                    status = "Approved"
                    reviewed = $false
                    date = $dateTime
                }
                
                # Load existing
                $json = Get-Content -Path $feedbackFile -Raw -Encoding utf8
                $reviews = ConvertFrom-JSONArray $json
                
                # Prepend new review
                $updatedReviews = @($feedbackItem) + $reviews
                
                $updatedJson = ConvertTo-JSONArray $updatedReviews
                [System.IO.File]::WriteAllText($feedbackFile, $updatedJson, [System.Text.Encoding]::UTF8)
                
                $responseBody = '{"success": true, "message": "Thank you for your feedback!"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }
            
            # --- ADMIN ACTION: UPDATE / DELETE FEEDBACK ---
            if ($request.HttpMethod -eq "POST" -and $url -eq "/api/feedback/update") {
                $session = Get-Session $request $sessionsFile
                if ($null -eq $session -or $session.role -ne "admin") {
                    $response.StatusCode = 403
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Forbidden: Admin access required."}')
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }

                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $params = $body | ConvertFrom-Json
                $id = $params.id
                $action = $params.action
                
                # Load existing
                $json = Get-Content -Path $feedbackFile -Raw -Encoding utf8
                $reviews = ConvertFrom-JSONArray $json
                
                $updatedReviews = @()
                $found = $false
                
                foreach ($r in $reviews) {
                    if ($r.id -eq $id) {
                        $found = $true
                        if ($action -eq "delete") {
                            continue
                        }
                        elseif ($action -eq "approve") {
                            $r.status = "Approved"
                            $r.reviewed = $true
                        }
                        elseif ($action -eq "reject") {
                            $r.status = "Rejected"
                            $r.reviewed = $true
                        }
                        elseif ($action -eq "toggle-reviewed") {
                            if ($null -eq $r.reviewed) {
                                $r.reviewed = $true
                            } else {
                                $r.reviewed = [bool](-not $r.reviewed)
                            }
                        }
                    }
                    $updatedReviews += $r
                }
                
                if ($found) {
                    $updatedJson = ConvertTo-JSONArray $updatedReviews
                    [System.IO.File]::WriteAllText($feedbackFile, $updatedJson, [System.Text.Encoding]::UTF8)
                    $responseBody = '{"success": true, "message": "Feedback updated successfully."}'
                } else {
                    $response.StatusCode = 404
                    $responseBody = '{"success": false, "message": "Feedback not found."}'
                }
                
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }
            
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Endpoint not found"}')
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            $response.Close()
            continue
        }

        if ($url -eq "/") { $url = "/index.html" }
        $url = $url.Replace("\", "/")
        $filePath = Join-Path $root $url
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($ext -eq ".html") { $contentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css") { $contentType = "text/css" }
            elseif ($ext -eq ".js") { $contentType = "application/javascript" }
            elseif ($ext -eq ".png") { $contentType = "image/png" }
            elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found")
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        Write-Host "Request handling error: $_"
        if ($response) {
            try { $response.Close() } catch {}
        }
    }
}

if ($listener) { $listener.Stop() }
