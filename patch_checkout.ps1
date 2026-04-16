$file = 'src\app\Checkout.tsx'
$c = Get-Content $file -Raw
$c = $c.Replace('placeholder="FULL NAME"', 'placeholder="FULL NAME" autoComplete="name" aria-label="Full name"')
$c = $c.Replace('placeholder="EMAIL ADDRESS"', 'placeholder="EMAIL ADDRESS" autoComplete="email" inputMode="email" aria-label="Email address"')
$c = $c.Replace('placeholder="STREET ADDRESS"', 'placeholder="STREET ADDRESS" autoComplete="street-address" aria-label="Street address"')
$c = $c.Replace('placeholder="CITY"', 'placeholder="CITY" autoComplete="address-level2" aria-label="City"')
$c = $c.Replace('placeholder="STATE"', 'placeholder="STATE" autoComplete="address-level1" aria-label="State"')
$c = $c.Replace('placeholder="ZIP"', 'placeholder="ZIP / POSTAL" autoComplete="postal-code" inputMode="text" aria-label="Postal code"')
$c | Set-Content $file -Encoding UTF8
Write-Host "Done"
