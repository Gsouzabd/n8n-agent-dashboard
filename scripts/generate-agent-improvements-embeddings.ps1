# Script para gerar embeddings para agent_improvements
# Execute este script após configurar a variável $SUPABASE_SERVICE_ROLE_KEY

param(
    [string]$SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [string]$SupabaseUrl = "https://bdhhqafyqyamcejkufxf.supabase.co"
)

if (-not $SupabaseServiceRoleKey) {
    Write-Host "ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada!" -ForegroundColor Red
    Write-Host "Configure a variável de ambiente ou passe como parâmetro:" -ForegroundColor Yellow
    Write-Host "  `$env:SUPABASE_SERVICE_ROLE_KEY = 'sua-key-aqui'" -ForegroundColor Yellow
    Write-Host "  .\generate-agent-improvements-embeddings.ps1" -ForegroundColor Yellow
    exit 1
}

$functionUrl = "$SupabaseUrl/functions/v1/vectorize-agent-improvements"

Write-Host "Gerando embeddings para registros sem embedding..." -ForegroundColor Green
Write-Host "URL: $functionUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $functionUrl -Method POST -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SupabaseServiceRoleKey"
    } -Body (@{} | ConvertTo-Json)

    Write-Host "`nResultado:" -ForegroundColor Green
    Write-Host "  Total: $($response.total)" -ForegroundColor Cyan
    Write-Host "  Processados: $($response.processed)" -ForegroundColor Green
    Write-Host "  Erros: $($response.errors)" -ForegroundColor $(if ($response.errors -gt 0) { "Red" } else { "Green" })
    Write-Host "  Mensagem: $($response.message)" -ForegroundColor Cyan

    if ($response.results) {
        Write-Host "`nDetalhes por registro:" -ForegroundColor Yellow
        foreach ($result in $response.results) {
            $color = if ($result.status -eq 'success') { "Green" } else { "Red" }
            Write-Host "  - $($result.id): $($result.status)" -ForegroundColor $color
            if ($result.error) {
                Write-Host "    Erro: $($result.error)" -ForegroundColor Red
            }
            if ($result.tokens) {
                Write-Host "    Tokens: $($result.tokens)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "ERRO ao executar a função:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}

Write-Host "`nConcluído!" -ForegroundColor Green

